import React, { useState } from 'react';
import { ChurchEventItem } from '../../../../types';
import { INITIAL_CHURCH_EVENTS } from '../../../../data/churchMockData';
import { useDialog } from '../../dialog';
import { DEFAULT_LOCATION, LOCATIONS } from '../../../../data/churchDomain'
;

/** The published dates, e.g. "April 16 – 19, 2025"; a single-day event reads "November 24, 2025".
 *  `en-US` because that is the month-first order the rest of the mockup and the church's own
 *  website use; `UTC` because these are calendar dates, not instants. */
const formatEventDate = (date: string, endDate?: string) => {
  const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
  const year = part(date, { year: 'numeric' });
  const first = part(date, { month: 'long', day: 'numeric' });
  if (!endDate) return `${first}, ${year}`;
  const sameMonth = date.slice(0, 7) === endDate.slice(0, 7);
  return `${first} – ${part(endDate, sameMonth ? { day: 'numeric' } : { month: 'long', day: 'numeric' })}, ${year}`;
};

export const EventsCalendarPanel: React.FC = () => {
  const [events, setEvents] = useState<ChurchEventItem[]>(INITIAL_CHURCH_EVENTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const creatingEventDialog = useDialog(() => setIsCreatingEvent(false), "Schedule New Church Event");
  const [rsvpSuccessId, setRsvpSuccessId] = useState<string | null>(null);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChurchEventItem['category']>('fellowship');
  const [ministry, setMinistry] = useState('Groups & Fellowships');
  const [date, setDate] = useState('2025-03-09');
  const [startTime, setStartTime] = useState('06:00 PM');
  const [endTime, setEndTime] = useState('08:00 PM');
  const [location, setLocation] = useState('Fellowship Hall · Nyahururu');
  const [campus, setCampus] = useState<string>(DEFAULT_LOCATION);
  const [description, setDescription] = useState('');
  const [rsvpRequired, setRsvpRequired] = useState(true);
  const [capacity, setCapacity] = useState<number>(60);
  const [contactPerson, setContactPerson] = useState('Arthur Wanjala');

  const filteredEvents = events.filter((evt) => {
    if (selectedCategory !== 'all' && evt.category !== selectedCategory) return false;
    return true;
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const colors: Record<ChurchEventItem['category'], string> = {
      worship: '#C2410C',
      fellowship: '#7C3AED',
      youth: '#D97706',
      outreach: '#2563EB',
      governance: '#059669',
      training: '#0891B2',
    };

    const newEvent: ChurchEventItem = {
      id: `evt-${Date.now()}`,
      title,
      category,
      ministry,
      date,
      startTime,
      endTime,
      location,
      campus,
      description,
      rsvpRequired,
      capacity: rsvpRequired ? Number(capacity) : undefined,
      rsvpsCount: 1,
      contactPerson,
      colorTag: colors[category] || '#C2410C',
    };

    setEvents([...events, newEvent]);
    setIsCreatingEvent(false);
    setTitle('');
    setDescription('');
  };

  const handleRsvp = (eventId: string) => {
    setEvents(
      events.map((e) => (e.id === eventId ? { ...e, rsvpsCount: e.rsvpsCount + 1 } : e))
    );
    setRsvpSuccessId(eventId);
    setTimeout(() => setRsvpSuccessId(null), 3000);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Scheduled Events</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{events.length} Upcoming</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">calendar_today</span>
              Master Calendar Active
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">event</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Total RSVPs Logged</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">
              {events.reduce((acc, e) => acc + e.rsvpsCount, 0)} Registrations
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">how_to_reg</span>
              Community Engagement High
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">confirmation_number</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">National Conferences</span>
            <div className="text-2xl font-black text-[#2563EB] mt-0.5">
              {events.filter((e) => e.title.includes('Conference')).length} Conventions
            </div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">public</span>
              AGM, Women’s & Youth
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#2563EB]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">handshake</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Youth & Fellowship</span>
            <div className="text-2xl font-black text-[#D97706] mt-0.5">
              {events.filter((e) => e.category === 'youth' || e.category === 'fellowship').length} Gatherings
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">groups</span>
              All ages represented
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">diversity_3</span>
          </div>
        </div>
      </div>

      {/* Events Master Directory */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">calendar_month</span>
              Church Events & Facilities Calendar
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Schedule church gatherings, track RSVP headcounts, and coordinate campus hall reservations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Event category filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="all">All Categories</option>
              <option value="worship">Worship Service</option>
              <option value="fellowship">Groups & Fellowships</option>
              <option value="youth">Youth & Discipleship Class</option>
              <option value="outreach">Outreach & Mercy</option>
              <option value="governance">Church Council</option>
              <option value="training">Training / Seminars</option>
            </select>

            <button
              type="button"
              onClick={() => setIsCreatingEvent(true)}
              className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
              Schedule Event
            </button>
          </div>
        </div>

        {/* Events Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((evt) => {
            const isRsvpd = rsvpSuccessId === evt.id;
            const percentFilled = evt.capacity ? Math.round((evt.rsvpsCount / evt.capacity) * 100) : null;

            return (
              <div
                key={evt.id}
                className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] hover:border-[#C2410C]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: evt.colorTag }}
                    >
                      {evt.category}
                    </span>

                    <span className="text-xs font-bold text-[#1C1917] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E7E5E4]">
                      {formatEventDate(evt.date, evt.endDate)}
                    </span>
                  </div>

                  <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-1">
                    {evt.title}
                  </h4>

                  <div className="text-xs text-[#57534E] flex items-center gap-1.5 mb-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#A8A29E]">schedule</span>
                    {evt.startTime} – {evt.endTime}
                    <span className="text-[#A8A29E]">·</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#A8A29E]">pin_drop</span>
                    <span className="truncate">{evt.location}</span>
                  </div>

                  <p className="text-xs text-[#57534E] leading-relaxed line-clamp-2 mb-3">
                    {evt.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E7E5E4]/80 flex items-center justify-between text-xs">
                  <div>
                    {evt.rsvpRequired ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#1C1917]">{evt.rsvpsCount} RSVPs</span>
                        {evt.capacity && (
                          <span className="text-[11px] text-[#A8A29E]">
                            / {evt.capacity} Max ({percentFilled}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#059669] font-bold">Open Admission</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {evt.rsvpRequired && (
                      <button
                        type="button"
                        onClick={() => handleRsvp(evt.id)}
                        className={`px-2.5 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                          isRsvpd
                            ? 'bg-[#059669] text-white'
                            : 'bg-[#C2410C] hover:bg-[#EA580C] text-white shadow-xs'
                        }`}
                      >
                        {isRsvpd ? 'RSVP Confirmed!' : '+ RSVP'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Schedule Event */}
      {isCreatingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...creatingEventDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Schedule New Church Event</h3>
              <button
                type="button"
                onClick={() => setIsCreatingEvent(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
              <div>
                <label htmlFor="event-title" className="block text-xs font-bold text-[#1C1917] mb-1">Event Title *</label>
                <input id="event-title" aria-label="Event Title"
                  type="text"
                  required
                  placeholder="e.g. Harvest Praise Feast & Hymn Festival"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-category" className="block text-xs font-bold text-[#1C1917] mb-1">Category</label>
                  <select id="event-category" aria-label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="worship">Worship & Service</option>
                    <option value="fellowship">Groups & Fellowships</option>
                    <option value="youth">Youth & Discipleship Class</option>
                    <option value="outreach">Outreach & Mercy</option>
                    <option value="governance">Church Council</option>
                    <option value="training">Training / Catechism</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="event-ministry" className="block text-xs font-bold text-[#1C1917] mb-1">Hosting Ministry</label>
                  <input id="event-ministry" aria-label="Hosting Ministry"
                    type="text"
                    value={ministry}
                    onChange={(e) => setMinistry(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="event-date" className="block text-xs font-bold text-[#1C1917] mb-1">Event Date</label>
                  <input id="event-date" aria-label="Event Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="event-start" className="block text-xs font-bold text-[#1C1917] mb-1">Start Time</label>
                  <input id="event-start" aria-label="Start Time"
                    type="text"
                    placeholder="06:00 PM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="event-end" className="block text-xs font-bold text-[#1C1917] mb-1">End Time</label>
                  <input id="event-end" aria-label="End Time"
                    type="text"
                    placeholder="08:00 PM"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-location" className="block text-xs font-bold text-[#1C1917] mb-1">Location / Room</label>
                  <input id="event-location" aria-label="Location / Room"
                    type="text"
                    placeholder="e.g. Fellowship Hall"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
                <div>
                  <label htmlFor="event-campus" className="block text-xs font-bold text-[#1C1917] mb-1">Campus</label>
                  <select id="event-campus" aria-label="Campus"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="event-description" className="block text-xs font-bold text-[#1C1917] mb-1">Event Description</label>
                <textarea id="event-description" aria-label="Event Description"
                  rows={3}
                  placeholder="Details for members and guests..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="rsvpReq"
                    checked={rsvpRequired}
                    onChange={(e) => setRsvpRequired(e.target.checked)}
                    className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                  />
                  <label htmlFor="rsvpReq" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                    RSVP Required
                  </label>
                </div>

                {rsvpRequired && (
                  <div>
                    <label htmlFor="event-capacity" className="block text-xs font-bold text-[#1C1917] mb-1">Capacity Limit</label>
                    <input id="event-capacity" aria-label="Capacity Limit"
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsCreatingEvent(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
