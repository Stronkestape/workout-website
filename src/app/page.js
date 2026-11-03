import Image from "next/image";
import Link from "next/link";
import { getWorkoutTheme } from "@/utils/workoutThemes";
import AnimatedWorkoutSection from "@/components/AnimatedWorkoutSection";

export const metadata = {
  title: "Mozgás Központ | Group Fitness & Workout Studio in Budapest",
  description:
    "Discover energizing group fitness classes in Budapest — WALKenergie, Spinning, Step Aerobics, Body Sculpting, Tabata, GYMSTICK, and Functional Training.",
};

const WORKOUT_SECTIONS = [
  {
    image: "/images/walkenergy.webp",
    title: "WALKenergie",
    durationLabel: "60 min",
    intensityLabel: "Moderate – High intensity",
    description:
      "A group walking fitness workout performed on mechanical treadmills with energizing music, designed to boost your endurance, stamina, and energy. Dynamic rhythm-driven walking routines keep your entire body engaged and burning calories from start to finish.",
  },
  {
    image: "/images/cycle.webp",
    title: "Spinning",
    durationLabel: "60 min",
    intensityLabel: "High intensity",
    description:
      "An indoor cycling fitness journey combining heart-pumping beats with motivating coaching. Climb steep virtual hills, accelerate through fast sprints, and strengthen your lower body while elevating your cardiovascular conditioning.",
  },
  {
    image: "/images/1.webp",
    title: "Step Aerobics",
    durationLabel: "60 min",
    intensityLabel: "Moderate intensity",
    description:
      "A dynamic, rhythm-driven step platform workout that enhances cardiovascular fitness and sculpts the lower body. Upbeat music and engaging choreographies improve coordination, balance, and agility.",
  },
  {
    image: "/images/3.webp",
    title: "Body Sculpting",
    durationLabel: "60 min",
    intensityLabel: "Moderate intensity",
    description:
      "A comprehensive body sculpting class built on aerobic movements and functional conditioning. Utilizing resistance bands, dumbbells, and bodyweight exercises, this class tones muscles, improves stamina, and helps relieve daily stress in a supportive community.",
  },
  {
    image: "/images/4.webp",
    title: "Tabata",
    durationLabel: "60 min",
    intensityLabel: "Maximum intensity (HIIT)",
    description:
      "High-intensity interval training (HIIT) structured around classic Tabata intervals: 20 seconds of all-out effort followed by 10 seconds of rest. Tabata boosts aerobic and anaerobic capacity, fires up metabolism, and sustains accelerated calorie burn for hours after the session.",
  },
  {
    image: "/images/5.webp",
    title: "GYMSTICK",
    durationLabel: "60 min",
    intensityLabel: "Moderate intensity",
    description:
      "A fiberglass resistance exercise bar with dual elastic bands engineered for smooth, joint-friendly strength and conditioning. It tones and shapes the entire body with minimal impact and maximum efficiency.",
  },
  {
    image: "/images/6.webp",
    title: "Functional Training",
    durationLabel: "60 min",
    intensityLabel: "High intensity",
    description:
      "Functional strength and movement training designed for real-world vitality. Circuit-based workouts combining free weights, bodyweight exercises, and agility drills to strengthen the core, improve mobility, and build balanced total-body power.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-stone-100 text-stone-900">
      {/* Hero Section */}
      <HeroSection />

      {/* Section Header */}
      <section
        id="workouts"
        className="py-16 sm:py-20 bg-stone-200 border-b border-stone-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-emerald-950 bg-emerald-200/80 border border-emerald-400/70 px-3.5 py-1.5 rounded-full mb-4">
            Group Classes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-stone-900">
            Our Workout Formats
          </h2>
          <p className="mt-4 text-base sm:text-lg text-stone-700 max-w-2xl mx-auto leading-relaxed">
            Diverse group classes led by certified, passionate coaches — from
            dynamic cardio journeys to high-intensity interval conditioning and
            functional strength.
          </p>
        </div>
      </section>

      {/* Alternating Editorial Workout Sections */}
      <div className="divide-y divide-stone-300">
        {WORKOUT_SECTIONS.map((workout, index) => (
          <WorkoutSection
            key={workout.title}
            index={index}
            image={workout.image}
            title={workout.title}
            durationLabel={workout.durationLabel}
            intensityLabel={workout.intensityLabel}
            description={workout.description}
            alignment={index % 2 === 0 ? "left" : "right"}
          />
        ))}
      </div>

      {/* Bottom Call-To-Action Banner */}
      <section className="py-16 sm:py-20 bg-stone-900 text-stone-100 border-t border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
            Ready for your next workout?
          </h2>
          <p className="mt-4 text-stone-300 text-base sm:text-lg max-w-2xl mx-auto">
            Check out our weekly schedule, pick your ideal class time, and
            reserve your spot in just a few clicks.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/calendar"
              prefetch={false}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta-hover text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors shadow-sm"
            >
              <span>View Schedule & Book</span>
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[82vh] w-full flex items-center overflow-hidden bg-stone-950">
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/images/2.webp"
          alt="Mozgás Központ background"
          fill
          className="object-cover object-center opacity-50"
          priority
          fetchPriority="high"
          quality={60}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/65 to-stone-950/90" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-white">
        <span className="inline-block text-xs sm:text-sm font-semibold uppercase tracking-widest text-emerald-400 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-1.5 rounded-full mb-6">
          Mozgás Központ Fitness Studio
        </span>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          Movement at the Center
        </h1>
        <p className="text-base sm:text-xl text-stone-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          Discover our energizing group classes and find the perfect workout for
          your goals in a supportive, modern studio environment.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/calendar"
            prefetch={false}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-warm-terracotta hover:bg-warm-terracotta-hover text-white px-8 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg"
          >
            <span>View Schedule</span>
            <ArrowRightIcon />
          </Link>
          <a
            href="#workouts"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all backdrop-blur-sm"
          >
            <span>Explore Classes</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function WorkoutSection({
  index,
  image,
  title,
  durationLabel,
  intensityLabel,
  description,
  alignment = "left",
}) {
  const isImageLeft = alignment === "left";
  const theme = getWorkoutTheme(title);
  const formattedIndex = String(index + 1).padStart(2, "0");

  return (
    <section
      className={`py-14 sm:py-20 lg:py-24 transition-colors overflow-hidden ${
        index % 2 === 0 ? "bg-stone-100" : "bg-stone-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedWorkoutSection index={index}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Image Column (~60% width on desktop via 7/12 columns, alternating left/right) */}
        <div
          className={`lg:col-span-7 ${
            isImageLeft ? "lg:order-1" : "lg:order-2"
          }`}
        >
          <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-lg border border-stone-300 bg-stone-200 group">
            <Image
              src={image}
              alt={title}
              fill
              quality={60}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 50vw, 640px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>
        </div>

        {/* Content Column (~40% width on desktop via 5/12 columns) */}
        <div
          className={`lg:col-span-5 ${
            isImageLeft ? "lg:order-2" : "lg:order-1"
          }`}
        >
          <div className="space-y-5 bg-white border border-stone-300 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Index & Category Header */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-stone-600">
                {formattedIndex}
              </span>
              <span className="h-px w-8 bg-stone-400" />
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${theme.accentText}`}
              >
                {theme.category}
              </span>
            </div>

            {/* Workout Title */}
            <div>
              <h3 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
                {title}
              </h3>
              <div
                className={`h-1 w-16 rounded-full mt-3 ${theme.accentBg}`}
              />
            </div>

            {/* Metadata Pills (SVG icons, no emojis) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-800 bg-stone-100 border border-stone-300 px-3 py-1.5 rounded-lg">
                <ClockIcon className="w-4 h-4 text-stone-700 shrink-0" />
                <span>{durationLabel}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-800 bg-stone-100 border border-stone-300 px-3 py-1.5 rounded-lg">
                <ActivityIcon className="w-4 h-4 text-stone-700 shrink-0" />
                <span>{intensityLabel}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-base sm:text-lg text-stone-800 leading-relaxed">
              {description}
            </p>

            {/* Action Link to filtered calendar */}
            <div className="pt-2">
              <Link
                href={`/calendar?filter=${encodeURIComponent(theme.key)}`}
                prefetch={false}
                className="inline-flex items-center gap-2.5 text-sm sm:text-base font-semibold text-stone-900 hover:text-warm-terracotta transition-colors group"
              >
                <span>Book this class in Calendar</span>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 border border-stone-300 group-hover:bg-warm-terracotta/10 group-hover:border-warm-terracotta/40 group-hover:translate-x-1 transition-all">
                  <ArrowRightIcon className="w-4 h-4 text-stone-800 group-hover:text-warm-terracotta transition-colors" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AnimatedWorkoutSection>
  </div>
</section>
  );
}

function ClockIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ActivityIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}
