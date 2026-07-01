import { TrackForm } from '@/components/track-form';
import { createTrackAction } from '../actions';

export default function NewTrackPage() {
  return (
    <div className="max-w-2xl">
      <p className="kicker">Applications</p>
      <h1 className="app-title mt-2">New career track</h1>
      <p className="app-subtitle">
        Name the role, give it a headline, and Lackey shapes your profile
        around it.
      </p>
      <div className="app-card mt-8 p-5">
        <TrackForm action={createTrackAction} submitLabel="Create track" />
      </div>
    </div>
  );
}
