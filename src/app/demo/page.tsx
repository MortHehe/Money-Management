import { notFound } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { createDemoBook } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO !== "true") {
    notFound();
  }

  return <Dashboard initialData={createDemoBook()} mode="demo" />;
}
