'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { parseJd } from '@/lib/jd/parse';
import { createJob, deleteJob, updateJob } from '@/lib/db/jobs';

export async function createJobAction(formData: FormData): Promise<{ error: string }> {
  const rawText = String(formData.get('raw_text') ?? '');
  let jobId: string;
  try {
    const parsed = await parseJd(rawText);
    const job = await createJob({
      title: parsed.title,
      company: parsed.company,
      raw_text: rawText,
      parsed,
    });
    jobId = job.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not add this job' };
  }
  revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/jobs/${jobId}`); // throws — never returns
}

export async function updateJobAction(id: string, patch: { title?: string; company?: string | null }): Promise<{ error?: string }> {
  try {
    await updateJob(id, patch);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' };
  }
  revalidatePath(`/dashboard/jobs/${id}`);
  return {};
}

export async function deleteJobAction(id: string): Promise<void> {
  await deleteJob(id);
  revalidatePath('/dashboard/jobs');
  redirect('/dashboard/jobs');
}
