// End-to-end data-layer verification against the live Supabase project.
// Creates a temp user + course, checks triggers and RLS, then cleans up.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const text = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, service, { auth: { persistSession: false } });
const pass = (label, ok) => console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

let userId, courseId;
const email = `verify_${Date.now()}@adventskool.test`;
const password = "VerifyPass123!";

try {
  // 1) Signup trigger -> profile row.
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Verify User", phone: "254712345678", role: "student" },
  });
  if (cErr) throw cErr;
  userId = created.user.id;
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  pass("handle_new_user creates profile", !!profile);
  pass("profile carries phone (254...)", profile?.phone === "254712345678");
  pass("profile carries role", profile?.role === "student");

  // 2) Course + lessons + lessons_count trigger.
  const { data: course } = await admin
    .from("courses")
    .insert({ title: "Verify Course", final_price: 4000, original_price: 4000, discounted_price: 0, published: true, instructor_id: null })
    .select("id")
    .single();
  courseId = course.id;
  const lessonRows = [1, 2, 3, 4].map((n) => ({ course_id: courseId, title: `Lesson ${n}`, order_index: n, content_html: `<p>secret ${n}</p>` }));
  const { data: lessons } = await admin.from("lessons").insert(lessonRows).select("id, order_index");
  const { data: courseAfter } = await admin.from("courses").select("lessons_count").eq("id", courseId).maybeSingle();
  pass("lessons_count trigger = 4", courseAfter?.lessons_count === 4);
  const firstLesson = lessons.find((l) => l.order_index === 1);

  // 3) Public preview view exposes titles without content.
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: previews } = await anonClient.from("lesson_previews").select("*").eq("course_id", courseId);
  pass("lesson_previews readable by anon (4 rows)", (previews?.length ?? 0) === 4);

  // 4) RLS: signed-in user CANNOT read locked lesson content.
  const userClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: signIn } = await userClient.auth.signInWithPassword({ email, password });
  pass("user can sign in", !!signIn.session);
  const { data: lockedRead } = await userClient.from("lessons").select("id").eq("id", firstLesson.id);
  pass("locked lesson content blocked by RLS", (lockedRead?.length ?? 0) === 0);

  // 5) After a paid unlock (service role), the user CAN read that lesson.
  await admin.from("lesson_unlocks").insert({ user_id: userId, course_id: courseId, lesson_id: firstLesson.id });
  const { data: unlockedRead } = await userClient.from("lessons").select("id, content_html").eq("id", firstLesson.id);
  pass("unlocked lesson now readable by user", (unlockedRead?.length ?? 0) === 1);

  // 6) RLS: user cannot read payments of others / write payments.
  const { error: payWrite } = await userClient.from("payments").insert({
    user_id: userId, course_id: courseId, plan_type: "full", amount: 1, paystack_reference: `x_${Date.now()}`,
  });
  pass("client payment INSERT blocked by RLS", !!payWrite);
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  // Cleanup.
  if (courseId) await admin.from("courses").delete().eq("id", courseId);
  if (userId) await admin.auth.admin.deleteUser(userId);
  console.log("cleanup done");
}
