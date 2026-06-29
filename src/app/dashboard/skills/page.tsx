import { listSkills } from '@/lib/db/skills';
import { SkillsClient } from './skills-client';

export default async function SkillsPage() {
  const skills = await listSkills();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Skills</h1>
      <SkillsClient skills={skills} />
    </div>
  );
}
