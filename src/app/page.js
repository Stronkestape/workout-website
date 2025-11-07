"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="bg-black">
      {/* Hero Section */}
      <HeroSection />

      {/* Workout Sections */}
      <WorkoutSection
        image="/images/walkenergy.jpg"
        title="WALKenergie"
        description="A WALKenergie mechanikus gyaloglógépen végzett zenés, csoportos fitnesz edzés, mely rengeteg pozitív tulajdonságával segít, hogy sokkal fittebbé, egészségesebbé és energikusabbá válhass! Az ütős zenékhez szenzációs programok társulnak! A lendületes, energikus mozdulatok egy perc nyugtot sem hagynak az izmaidanak, az egész testedet felpörgetik!"
        alignment="left"
      />

      <WorkoutSection
        image="/images/cycle.jpg"
        title="Spinning"
        description="A Spinning edzés egy zenés, csoportos fitnesz program, amely a kerékpározás élményét hozza el a terembe. Az energikus zene és a motiváló edző segítségével a résztvevők egy virtuális kerékpáros kalandra indulnak, miközben erősítik a lábizmokat és javítják a kardio állóképességüket."
        alignment="left"
      />

      <WorkoutSection
        image="/images/1.jpg"
        title="Step Aerobik"
        description="A Step Aerobik edzés egy dinamikus, zenés fitnesz program, amely lépcsőn végzett gyakorlatokat tartalmaz. A résztvevők energikus zenére lépnek fel és le a lépcsőn, miközben javítják állóképességüket és erősítik izmaikat. Az edzés során a koordináció és a ritmusérzék is fejlődik."
        alignment="left"
      />

      <WorkoutSection
        image="/images/3.jpg"
        title="Alakformáló"
        description="Az Alakformáló órán az aerobic alaplépésekből állnak. Igyeszünk a leghobb zenékkel előállni, a hangulat a vendégeknek köszönhetően mindig fergeteges.
                     Különböző fitnesz eszközöket hívunk segítségül a cél elérése érdekében, mint pl.: miniband vagy kézi súlyzó, vagy éppen saját testsúllyal dolgozunk.
                     Ha szeretnél formálódni, állóképességet növelni, levezetni a stresszt vagy csak jól érezni magad, mi szeretettel várunk!"
        alignment="left"
      />

      <WorkoutSection
        image="/images/4.jpg"
        title="Tabata "
        description="A Tabata nagy intenzitású intervallumos edzés (HIIT) -  4 perces körökre épül, azon belül 20 másodperces extrém terheléses és 10 másodperces pihenőidőszakok váltakoznak 8 sorozatra osztva, a 4. perc végén 1 perc pihenés, majd újabb kör kezdődik.
                     Milyen hatása van a tabata edzésnek?
                     A tabata elsődleges előnye a test aerob és anaerob kapacitásának növelése. Az edzés során az anaerob folyamatok dominálnak, amelyek hozzájárulnak az úgynevezett oxigénadóssághoz, ami azt jelenti, hogy több oxigént fogyasztunk, mint általában a pihenés alatt, és ez segít felgyorsítani az anyagcserét és további erőfeszítés nélkül kalóriát égetni. Az eredmény a testzsír csökkenése és karcsúbb alak. Az edzés után akár 48 órával is felgyorsítja a kalóriaégetés ütemét."
        alignment="left"
      />

      <WorkoutSection
        image="/images/5.jpg"
        title="GYMSTICK"
        description="A GYMSTICK™ egy üvegszálas bot, két gumikötéllel, ami egy nagyon hatékony sporteszköz.
                     Segít az alakformálásban, a fogyásban, szálkásítja az izmokat, kíméli az izületeket  - helyettesítheti a súlyzót, sérülés veszély nélkül."
        alignment="left"
      />

      <WorkoutSection
        image="/images/6.jpg"
        title="Funkcionális edzés"
        description="A funkcionális edzés célja hogy erősebbé, és hatékonyabbá tegye a mindennapi életben is. Segít fejleszteni azokat a mozgásokat, amiket a mindennapokban is használunk, mint példáiul a hajlítás, tolás, emelés, nyújtás. 
                     A funkcionális edzés az izmokra fókuszál, több izomcsoportot mozgat meg egy edzés alatt, köredzés jelleggel keveri az eszközös, a torna és a saját testsúlyos gyakorlatokat. A teljes testet erősíti, javítja a stabilitást, a koordinációt és fejleszti az állóképességet, a gyorsaságot és a robbanékonyságat. 
                     Bárkinek ajánljuk, hiszen erőnléttől és fittségi szinttől függően állítja be az edző a különböző feladatokat."
        alignment="left"
      />

      {/* Add more workout sections here with alternating alignment */}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-fixed">
        <Image
          src="/images/2.jpg"
          alt="Fitness Background"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
        <h1 className="text-5xl md:text-7xl font-bold text-center mb-6 animate-fade-in">
          Mozgás Központ
        </h1>
        <p className="text-xl md:text-2xl text-center mb-8 max-w-2xl animate-fade-in-delay">
          Központban a mozgás!
        </p>
        <p className="text-lg md:text-xl text-center mb-12 max-w-3xl text-gray-200 animate-fade-in-delay-2">
          Fedezd fel változatos csoportos óráinkat és találd meg a tökéletes
          edzést magadnak
        </p>
        <a
          href="/calendar"
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all transform hover:scale-105 animate-fade-in-delay-3"
        >
          Órarend megtekintése
        </a>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }

        .animate-fade-in-delay {
          opacity: 0;
          animation: fadeIn 1s ease-out 0.3s forwards;
        }

        .animate-fade-in-delay-2 {
          opacity: 0;
          animation: fadeIn 1s ease-out 0.6s forwards;
        }

        .animate-fade-in-delay-3 {
          opacity: 0;
          animation: fadeIn 1s ease-out 0.9s forwards;
        }
      `}</style>
    </section>
  );
}

function WorkoutSection({ image, title, description, alignment = "left" }) {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.3, // Trigger when 30% of section is visible
        rootMargin: "-100px 0px",
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

  const isLeft = alignment === "left";

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          sizes="100vw"
        />
        {/* Gradient Overlay - stronger on content side */}
        <div
          className={`absolute inset-0 ${
            isLeft
              ? "bg-gradient-to-r from-black/90 via-black/70 to-black/30"
              : "bg-gradient-to-l from-black/90 via-black/70 to-black/30"
          }`}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
          <div
            className={`max-w-2xl transform transition-all duration-1000 ${
              isVisible
                ? "translate-x-0 opacity-100"
                : isLeft
                ? "-translate-x-20 opacity-0"
                : "translate-x-20 opacity-0"
            }`}
          >
            {/* Title */}
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
              {title}
            </h2>

            {/* Decorative Line */}
            <div
              className={`h-1 bg-green-500 mb-8 transition-all duration-1000 delay-300 ${
                isVisible ? "w-24" : "w-0"
              }`}
            />

            {/* Description */}
            <p
              className={`text-lg md:text-xl text-gray-200 leading-relaxed transition-all duration-1000 delay-500 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {description}
            </p>

            {/* CTA Button */}
            <a
              href="/calendar"
              className={`inline-block mt-8 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-semibold transition-all transform hover:scale-105 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: "700ms" }}
            >
              Időpontok foglalása →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
