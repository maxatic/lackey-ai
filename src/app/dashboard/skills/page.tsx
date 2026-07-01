import { listSkills } from '@/lib/db/skills';
import { SkillsClient } from './skills-client';

export default async function SkillsPage() {
  const skills = await listSkills();
  return (
    <div className="max-w-2xl">
      <p className="kicker">Your skeleton</p>
      <h1 className="app-title mt-2">Skills</h1>
      <p className="app-subtitle">
        Everything you can do, in one list. Tailoring picks and reorders these
        per job, so err on the side of adding.
      </p>
      <div className="mt-8">
        <SkillsClient skills={skills} />
      </div>
    </div>
  );
}
