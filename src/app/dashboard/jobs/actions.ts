'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { parseJd } from '@/lib/jd/parse';
import { createJob, deleteJob, updateJob, updateJobStatus } from '@/lib/db/jobs';
import { isJobStatus } from '@/lib/db/job-status';
import { toActionError } from '@/lib/action-error';

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
    return { error: toActionError(err) };
  }
  revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/jobs/${jobId}`); // throws — never returns
}

export async function updateJobAction(id: string, patch: { title?: string; company?: string | null }): Promise<{ error?: string }> {
  try {
    // Whitelist: server-action args are attacker-controllable — never spread the raw patch
    // (would bypass the notes cap and the status/applied_at gate).
    await updateJob(id, {
      ...(patch.title !== undefined ? { title: String(patch.title) } : {}),
      ...(patch.company !== undefined ? { company: patch.company === null ? null : String(patch.company) } : {}),
    });
  } catch (err) {
    return { error: toActionError(err) };
  }
  revalidatePath(`/dashboard/jobs/${id}`);
  return {};
}

export async function updateJobStatusAction(id: string, status: string): Promise<{ error?: string }> {
  try {
    if (!isJobStatus(status)) throw new Error('Invalid status');
    await updateJobStatus(id, status);
  } catch (err) {
    return { error: toActionError(err) };
  }
  revalidatePath('/dashboard/jobs');
  revalidatePath(`/dashboard/jobs/${id}`);
  return {};
}

export async function updateJobNotesAction(id: string, notes: string): Promise<{ error?: string }> {
  try {
    if (notes.length > 5000) throw new Error('Notes are too long (max 5,000 characters)');
    await updateJob(id, { notes });
  } catch (err) {
    return { error: toActionError(err) };
  }
  revalidatePath(`/dashboard/jobs/${id}`);
  return {};
}

export async function deleteJobAction(id: string): Promise<void> {
  await deleteJob(id);
  revalidatePath('/dashboard/jobs');
  redirect('/dashboard/jobs');
}
