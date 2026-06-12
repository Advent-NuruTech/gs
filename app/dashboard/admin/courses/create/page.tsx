import CourseUploadForm from "@/components/course/CourseUploadForm";

export default function AdminCreateCoursePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Create Course (Admin)</h2>
      <CourseUploadForm />
    </section>
  );
}

