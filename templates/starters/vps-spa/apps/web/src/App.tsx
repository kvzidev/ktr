import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@nanostores/react";
import { CreateIssueSchema, type CreateIssueInput } from "@repo/shared";
import { useForm } from "react-hook-form";
import { $priorityFilter } from "./stores/issues.js";

export function App() {
  const priorityFilter = useStore($priorityFilter);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateIssueInput>({
    resolver: zodResolver(CreateIssueSchema),
    defaultValues: { title: "", priority: "medium" },
  });

  const onSubmit = (data: CreateIssueInput) => {
    void data;
  };

  return (
    <main className="mx-auto max-w-3xl p-8 font-sans">
      <h1 className="text-3xl font-bold">Team Issue Tracker</h1>
      <p className="mt-1 text-sm text-slate-500">Filter: {priorityFilter}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex gap-2">
        <input
          {...register("title")}
          placeholder="New issue title"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Create
        </button>
      </form>
      {errors.title && (
        <p className="mt-2 text-sm text-red-600">{errors.title.message}</p>
      )}
    </main>
  );
}
