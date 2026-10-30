"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getWorkoutTheme } from "@/utils/workoutThemes";

const WORKOUT_SECTIONS = [
  {
    image: "/images/walkenergy.jpg",
    title: "WALKenergie",
    durationLabel: "60 perc",
    intensityLabel: "Közepes – Magas intenzitás",
    description:
      "A WALKenergie mechanikus gyaloglógépen végzett zenés, csoportos fitnesz edzés, mely rengeteg pozitív tulajdonságával segít, hogy sokkal fittebbé, egészségesebbé és energikusabbá válhass! Az ütős zenékhez szenzációs programok társulnak! A lendületes, energikus mozdulatok egy perc nyugtot sem hagynak az izmaidnak, az egész testedet felpörgetik!",
  },
  {
    image: "/images/cycle.jpg",
    title: "Spinning",
    durationLabel: "60 perc",
    intensityLabel: "Magas intenzitás",
    description:
      "A Spinning edzés egy zenés, csoportos fitnesz program, amely a kerékpározás élményét hozza el a terembe. Az energikus zene és a motiváló edző segítségével a résztvevők egy virtuális kerékpáros kalandra indulnak, miközben erősítik a lábizmokat és javítják a kardió állóképességüket.",
  },
  {
    image: "/images/1.jpg",
    title: "Step Aerobik",
    durationLabel: "60 perc",
    intensityLabel: "Közepes intenzitás",
    description:
      "A Step Aerobik edzés egy dinamikus, zenés fitnesz program, amely lépcsőn végzett gyakorlatokat tartalmaz. A résztvevők energikus zenére lépnek fel és le a lépcsőn, miközben javítják állóképességüket és erősítik izmaikat. Az edzés során a koordináció és a ritmusérzék is fejlődik.",
  },
  {
    image: "/images/3.jpg",
    title: "Alakformáló",
    durationLabel: "60 perc",
    intensityLabel: "Közepes intenzitás",
    description:
      "Az Alakformáló órák az aerobik alaplépéseire épülnek. Igyekszünk a legjobb zenékkel előállni, a hangulat a vendégeknek köszönhetően mindig fergeteges. Különböző fitnesz eszközöket hívunk segítségül a cél elérése érdekében, mint pl.: miniband vagy kézi súlyzó, vagy éppen saját testsúllyal dolgozunk. Ha szeretnél formálódni, állóképességet növelni, levezetni a stresszt vagy csak jól érezni magad, mi szeretettel várunk!",
  },
  {
    image: "/images/4.jpg",
    title: "Tabata",
    durationLabel: "60 perc",
    intensityLabel: "Maximális intenzitás (HIIT)",
    description:
      "A Tabata nagy intenzitású intervallumos edzés (HIIT) – 4 perces körökre épül, azon belül 20 másodperces extrém terheléses és 10 másodperces pihenőidőszakok váltakoznak 8 sorozatra osztva, a 4. perc végén 1 perc pihenés, majd újabb kör kezdődik. A tabata elsődleges előnye a test aerob és anaerob kapacitásának növelése, amely felgyorsítja az anyagcserét, csökkenti a testzsírt, és az edzés után akár 48 órával is fokozza a kalóriaégetés ütemét.",
  },
  {
    image: "/images/5.jpg",
    title: "GYMSTICK",
    durationLabel: "60 perc",
    intensityLabel: "Közepes intenzitás",
    description:
      "A GYMSTICK™ egy üvegszálas bot két gumikötéllel, ami egy rendkívül hatékony sporteszköz. Segít az alakformálásban és a fogyásban, szálkásítja az izmokat, miközben kíméli az ízületeket – helyettesítheti a súlyzót, sérülésveszély nélkül.",
  },
  {
    image: "/images/6.jpg",
    title: "Funkcionális edzés",
    durationLabel: "60 perc",
    intensityLabel: "Magas intenzitás",
    description:
      "A funkcionális edzés célja, hogy erősebbé és hatékonyabbá tegyen a mindennapi életben is. Segít fejleszteni azokat a mozgásokat, amiket a mindennapokban használunk, mint például a hajlítás, tolás, emelés és nyújtás. Köredzés jelleggel keveri az eszközös, a torna és a saját testsúlyos gyakorlatokat, így a teljes testet erősíti, javítja a stabilitást, a koordinációt, az állóképességet és a robbanékonyságot.",
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
            Csoportos Óráink
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-stone-900">
            Mozgásformáink
          </h2>
          <p className="mt-4 text-base sm:text-lg text-stone-700 max-w-2xl mx-auto leading-relaxed">
            Változatos, szakértő edzők által vezetett csoportos edzések — a
            lendületes kardiótól a magas intenzitású intervallum és funkcionális
            erőnléti órákig.
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
            Készen állsz a következő edzésedre?
          </h2>
          <p className="mt-4 text-stone-300 text-base sm:text-lg max-w-2xl mx-auto">
            Tekintsd meg az aktuális heti órarendet, válaszd ki a számodra
            ideális időpontot, és foglald le a helyed néhány kattintással.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/calendar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors shadow-sm"
            >
              <span>Órarend és foglalás</span>
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
          src="/images/2.jpg"
          alt="Mozgás Központ háttérkép"
          fill
          className="object-cover object-center opacity-50"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/65 to-stone-950/90" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-white">
        <span className="inline-block text-xs sm:text-sm font-semibold uppercase tracking-widest text-green-400 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-1.5 rounded-full mb-6">
          Mozgás Központ Fitness Stúdió
        </span>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          Központban a mozgás!
        </h1>
        <p className="text-base sm:text-xl text-stone-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          Fedezd fel változatos csoportos óráinkat, és találd meg a céljaidhoz
          legjobban illeszkedő edzésformát modern, motiváló környezetben.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/calendar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg"
          >
            <span>Órarend megtekintése</span>
            <ArrowRightIcon />
          </Link>
          <a
            href="#workouts"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all backdrop-blur-sm"
          >
            <span>Mozgásformák</span>
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
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    const currentRef = sectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const isImageLeft = alignment === "left";
  const theme = getWorkoutTheme(title);
  const formattedIndex = String(index + 1).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      className={`py-14 sm:py-20 lg:py-24 transition-colors ${
        index % 2 === 0 ? "bg-stone-100" : "bg-stone-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
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
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              <div className="absolute top-4 left-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm backdrop-blur-md ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                >
                  {theme.category}
                </span>
              </div>
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

              {/* Action Link */}
              <div className="pt-2">
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-2.5 text-sm sm:text-base font-semibold text-stone-900 hover:text-green-800 transition-colors group"
                >
                  <span>Időpontok foglalása</span>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 border border-stone-300 group-hover:bg-green-200 group-hover:border-green-400 group-hover:translate-x-1 transition-all">
                    <ArrowRightIcon className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
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
