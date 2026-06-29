import { TrackForm } from '@/components/track-form';
import { createTrackAction } from '../actions';

export default function NewTrackPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">New Career Track</h1>
      <TrackForm action={createTrackAction} submitLabel="Create track" />
    </div>
  );
}
