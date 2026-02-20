"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase/config";

interface Metrics {
  users: number;
  courses: number;
  enrollments: number;
  pendingPayments: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    users: 0,
    courses: 0,
    enrollments: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    async function load() {
      const [usersSnap, coursesSnap, enrollmentsSnap] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "courses")),
        getCountFromServer(collection(db, "enrollments")),
      ]);
      const paymentsSnapshot = await getDocs(query(collection(db, "payments"), where("status", "==", "pending")));
      setMetrics({
        users: usersSnap.data().count,
        courses: coursesSnap.data().count,
        enrollments: enrollmentsSnap.data().count,
        pendingPayments: paymentsSnapshot.size,
      });
    }
    load();
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Users</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.users}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.courses}</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Enrollments</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.enrollments}</p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">Pending Payments</p>
          <p className="text-2xl font-bold text-amber-900">{metrics.pendingPayments}</p>
        </article>
      </div>
    </section>
  );
}
