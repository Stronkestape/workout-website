import Link from 'next/link';
import { createSupabasePublicClient } from '@/lib/publicSupabase';
import { formatTime } from '@/utils/calendarHelpers';
import { unstable_cache } from 'next/cache';

export const revalidate = 300; // 5-minute Edge ISR caching

export const metadata = {
  title: 'Oktatóink | Mozgás Központ',
  description:
    'Ismerd meg a Mozgás Központ felkészült, elhivatott oktatói csapatát. Spinning, WALKenergie, HIIT és funkcionális tréning oktatóink.',
};

// Rich instructor profile metadata for bio, certifications, and teaching philosophy
const INSTRUCTOR_PROFILES = {
  demo_instructor: {
    role: 'Vezető Oktató & Spinning® Tréner',
    experience: '8+ év tapasztalat',
    certification: 'IWI Személyi Edző • Mad Dogg Spinning® Certified',
    specialties: ['Spinning®', 'Funkcionális Tréning', 'Alakformálás'],
    bio: 'Több mint 8 éve vezetek csoportos állóképességi és funkcionális edzéseket. Az óráimon a precíz biomechanika és a magával ragadó zenei ritmus ötvöződik, hogy kihozd magadból a maximumot.',
    quote: '„A kitartás nem velünk születik — edzésről edzésre építjük fel.”',
  },
  coach_eszter: {
    role: 'WALKenergie & Aerobik Oktató',
    experience: '6+ év tapasztalat',
    certification: 'WALKenergie Master Trainer • Testnevelési Egyetem',
    specialties: ['WALKenergie', 'Step Aerobik', 'Kardió Kondicionálás'],
    bio: 'A WALKenergie és a csoportos kardióórák a feltöltődés legtisztább formái. Kiemelt figyelmet fordítok az ízületbarát, dinamikus felépítésre és a jó hangulatra minden egyes órán.',
    quote: '„Minden egyes lépés közelebb visz egy energikusabb, egészségesebb önmagadhoz.”',
  },
  coach_bence: {
    role: 'HIIT & GYMSTICK Tréner',
    experience: '5+ év tapasztalat',
    certification: 'Funkcionális Erőnléti Tréner • GYMSTICK International',
    specialties: ['Tabata (HIIT)', 'GYMSTICK', 'Erőnlét & Kondíció'],
    bio: 'Magas intenzitású intervallum tréningekre és funkcionális eszközös edzésekre specializálódtam. Célom, hogy segítsek biztonságosan és hatékonyan átlépni a komfortzónádat.',
    quote: '„Nem a könnyebb utat keressük — erősebbé formáljuk magunkat.”',
  },
};

const DEFAULT_PROFILE = {
  role: 'Csoportos Fitnesz Oktató',
  experience: 'Szakképzett Oktató',
  certification: 'Okleveles Csoportos Fitness Instruktor',
  specialties: ['Csoportos Órák', 'Erőnlét & Kondíció'],
  bio: 'Elhivatott a helyes mozgásminták tanítása és az összetartó, motiváló közösségi élmény mellett.',
  quote: '„A mozgás öröme mindenkié.”',
};


const getCachedInstructorsData = unstable_cache(
  async () => {
    const supabase = createSupabasePublicClient();
    const nowIso = new Date().toISOString();

    const [instructorsResult, sessionsResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, username, full_name, user_tier')
        .eq('user_tier', 'instructor')
        .order('full_name', { ascending: true }),
      supabase
        .from('class_sessions')
        .select(`
          id,
          instructor_id,
          start_time,
          workout_classes (
            id,
            title,
            duration,
            max_capacity
          )
        `)
        .gte('start_time', nowIso)
        .eq('is_active', true)
        .order('start_time', { ascending: true })
        .limit(30),
    ]);

    return {
      instructors: instructorsResult.data || [],
      upcomingSessions: sessionsResult.data || [],
    };
  },
  ['instructors-page-cache'],
  { revalidate: 300, tags: ['instructors-cache'] }
);

export default async function InstructorsPage() {
  const { instructors, upcomingSessions } = await getCachedInstructorsData();

  // Group upcoming sessions by instructor_id
  const sessionsByInstructor = {};
  (upcomingSessions || []).forEach((session) => {
    if (!session.instructor_id) return;
    if (!sessionsByInstructor[session.instructor_id]) {
      sessionsByInstructor[session.instructor_id] = [];
    }
    if (sessionsByInstructor[session.instructor_id].length < 2) {
      sessionsByInstructor[session.instructor_id].push(session);
    }
  });

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/15 border border-warm-terracotta/30 text-[#8c3010] text-xs font-semibold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8c3010] shrink-0" aria-hidden="true" />
          <span>Szakértelem & Közösség</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
          Ismerd Meg Oktatói Csapatunkat
        </h1>
        <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
          Szakképzett, elhivatott oktatóink irányításával minden edzés inspiráló élménnyé válik. Legyél akár kezdő vagy haladó sportoló, oktatóink segítenek elérni a céljaidat.
        </p>
      </div>

      {/* Instructors Grid */}
      {instructors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200/80 shadow-xs max-w-md mx-auto">
          <p className="text-stone-600 font-medium">Jelenleg nincsenek elérhető oktatói profilok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {instructors.map((instructor) => {
            const meta = INSTRUCTOR_PROFILES[instructor.username] || DEFAULT_PROFILE;
            const nextClasses = sessionsByInstructor[instructor.id] || [];
            const displayName =
              instructor.full_name?.replace(' (Coach)', '') || `@${instructor.username}`;
            const initials = displayName
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={instructor.id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow p-6 sm:p-8 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Avatar & Name */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white font-bold flex items-center justify-center text-lg tracking-wider shrink-0 shadow-inner">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-stone-900 truncate">
                        {displayName}
                      </h2>
                      <div className="text-xs font-semibold text-[#8c3010] truncate mt-0.5">
                        {meta.role}
                      </div>
                      <div className="text-xs text-stone-600 truncate">
                        @{instructor.username}
                      </div>
                    </div>
                  </div>

                  {/* Badges / Experience */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-medium border border-stone-200/60">
                      {meta.experience}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 font-medium border border-stone-200/60 truncate max-w-[200px]">
                      {meta.certification}
                    </span>
                  </div>

                  {/* Specialty Tags */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                      Szakterületek
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-800"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bio Paragraph */}
                  <p className="text-sm text-stone-600 leading-relaxed mb-4">
                    {meta.bio}
                  </p>

                  {/* Instructor Quote */}
                  <div className="mb-6 bg-stone-50 rounded-xl p-3 border-l-2 border-warm-terracotta text-xs italic text-stone-700">
                    {meta.quote}
                  </div>
                </div>

                {/* Card Footer: Next Sessions & Calendar Link */}
                <div className="pt-4 border-t border-stone-200/80 space-y-4">
                  {nextClasses.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-warm-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Közelgő órái az órarendben:</span>
                      </div>
                      <div className="space-y-1.5">
                        {nextClasses.map((session) => (
                          <div
                            key={session.id}
                            className="flex justify-between items-center text-xs p-2 rounded-lg bg-stone-50 border border-stone-200/60"
                          >
                            <span className="font-semibold text-stone-800 truncate">
                              {session.workout_classes?.title}
                            </span>
                            <span className="text-stone-600 shrink-0 ml-2">
                              {new Date(session.start_time).toLocaleDateString('hu-HU', {
                                timeZone: 'Europe/Budapest',
                                month: 'short',
                                day: 'numeric',
                                weekday: 'short',
                              })}{' '}
                              • {formatTime(session.start_time)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-stone-600 italic">
                      Hamarosan új időpontok kerülnek kiírásra.
                    </div>
                  )}

                  <Link href="/calendar" prefetch={false}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
                  >
                    <span>Edzések az Órarendben</span>
                    <svg className="w-4 h-4 text-warm-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quality Highlights Section */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-8 sm:p-12 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            Miért érdemes nálunk edzened?
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            A csoportos edzéseink ereje a szakértő figyelemben és az inspiráló közösségben rejlik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
            <div className="w-10 h-10 rounded-xl bg-warm-terracotta/15 flex items-center justify-center text-warm-terracotta">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Személyre Szabott Hibajavítás</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Csoportos órán is kiemelt figyelmet fordítunk a helyes testtartásra és a mozgás pontos kivitelezésére a sérülések megelőzése érdekében.
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
            <div className="w-10 h-10 rounded-xl bg-warm-terracotta/15 flex items-center justify-center text-warm-terracotta">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Skálázható Intenzitás</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Minden gyakorlathoz könnyített és nehezített variációt kínálunk, így a kezdők és a haladók is a saját ütemükben fejlődhetnek.
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
            <div className="w-10 h-10 rounded-xl bg-warm-terracotta/15 flex items-center justify-center text-warm-terracotta">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Összetartó Közösség</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Közösen edzeni sokkal motiválóbb és élvezetesebb. A csoportos energia átlendít a nehéz pillanatokon és segít a rendszeresség fenntartásában.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
