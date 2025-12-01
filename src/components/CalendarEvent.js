import { SPOTS_ALMOST_FULL_THRESHOLD, SPOTS_FULL_THRESHOLD } from '../utils/constants';

export default function CalendarEvent({ event }) {
  const spotsLeft = event.resource.spotsLeft;
  const isAlmostFull = spotsLeft <= SPOTS_ALMOST_FULL_THRESHOLD && spotsLeft > SPOTS_FULL_THRESHOLD;
  const isFull = spotsLeft <= SPOTS_FULL_THRESHOLD;
  const isBooked = event.resource.isBooked;
  
  return (
    <div className={`text-xs ${isAlmostFull ? 'font-bold' : ''} ${isFull ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-1">
        <span>{event.title}</span>
        {isBooked && <span className="text-sm">✓</span>}
      </div>
      <div className="opacity-75">
        {spotsLeft > SPOTS_FULL_THRESHOLD ? `${spotsLeft} spots left` : 'Full'}
      </div>
    </div>
  );
}