import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800" role="contentinfo">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand & About */}
          <div className="space-y-4">
            <Link
              href="/"
              aria-label="Mozgás Központ – Kezdőlap"
              className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-warm-terracotta transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-warm-terracotta shrink-0" aria-hidden="true" />
              <span>Mozgás Központ</span>
            </Link>
            <p className="text-sm text-stone-400 leading-relaxed">
              Prémium csoportos funkcionális edzések, Spinning és WALKenergie órák Újbudán. Szakképzett oktatói gárda, modern terem és inspiráló közösség.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/60 text-xs font-semibold text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                <span>Nyitva a hét minden napján</span>
              </span>
            </div>
          </div>

          {/* Column 2: Opening Hours */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Nyitvatartás
            </h3>
            <ul className="space-y-2.5 text-sm text-stone-300">
              <li className="flex justify-between items-center py-1 border-b border-stone-800/80">
                <span className="text-stone-400">Hétfő – Péntek:</span>
                <span className="font-medium text-white">06:30 – 21:00</span>
              </li>
              <li className="flex justify-between items-center py-1 border-b border-stone-800/80">
                <span className="text-stone-400">Szombat:</span>
                <span className="font-medium text-white">08:00 – 16:00</span>
              </li>
              <li className="flex justify-between items-center py-1 border-b border-stone-800/80">
                <span className="text-stone-400">Vasárnap:</span>
                <span className="font-medium text-white">09:00 – 14:00</span>
              </li>
            </ul>
            <p className="text-xs text-stone-400 leading-relaxed pt-1">
              A csoportos órák kezdete előtt 15 perccel javasolt az érkezés az öltözéshez és bejelentkezéshez.
            </p>
          </div>

          {/* Column 3: Contact & Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Elérhetőség & Cím
            </h3>
            <ul className="space-y-3 text-sm text-stone-300">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-warm-terracotta shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="leading-relaxed">
                  1117 Budapest, Október huszonharmadika u. 8–10. (Allee mellett)
                </span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-warm-terracotta shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+3614567890" className="hover:text-white transition-colors">
                  +36 1 456 7890
                </a>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-warm-terracotta shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:info@mozgaskozpont.hu" className="hover:text-white transition-colors truncate">
                  info@mozgaskozpont.hu
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Quick Links & Cancellation Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Navigáció & Információ
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/calendar" prefetch={false} className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <span className="text-warm-terracotta" aria-hidden="true">›</span>
                  <span>Órarend & Foglalás</span>
                </Link>
              </li>
              <li>
                <Link href="/bookings" prefetch={false} className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <span className="text-warm-terracotta" aria-hidden="true">›</span>
                  <span>Saját foglalásaim</span>
                </Link>
              </li>
              <li>
                <Link href="/instructors" prefetch={false} className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <span className="text-warm-terracotta" aria-hidden="true">›</span>
                  <span>Edzőink & Oktatóink</span>
                </Link>
              </li>
            </ul>

            <div className="pt-2 bg-stone-800/50 p-3 rounded-xl border border-stone-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                <svg className="w-4 h-4 text-warm-terracotta shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Lemondási szabályzat</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Foglalás lemondása legkésőbb a kezdés előtt 2 órával díjmentesen lehetséges.
              </p>
            </div>
          </div>
        </div>

        {/* Social Links Row */}
        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-400 text-center sm:text-left">
            Kövess minket a közösségi médiában friss hírekért, akciókért és edzéstippekért:
          </div>

          <div className="flex items-center space-x-3">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mozgás Központ Facebook oldal"
              className="w-9 h-9 rounded-full bg-stone-800 hover:bg-warm-terracotta text-stone-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mozgás Központ Instagram oldal"
              className="w-9 h-9 rounded-full bg-stone-800 hover:bg-warm-terracotta text-stone-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mozgás Központ YouTube csatorna"
              className="w-9 h-9 rounded-full bg-stone-800 hover:bg-warm-terracotta text-stone-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.254.418-4.814a2.503 2.503 0 0 1 1.768-1.768C5.745 5 12 5 12 5s6.255 0 7.812.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom Legal Copyright Bar */}
        <div className="mt-8 pt-6 border-t border-stone-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-3">
          <div>
            © {currentYear} Mozgás Központ Stúdió. Minden jog fenntartva.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer">
              Házirend
            </span>
            <span>•</span>
            <span className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer">
              Adatkezelési tájékoztató
            </span>
            <span>•</span>
            <span className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer">
              ÁSZF
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
