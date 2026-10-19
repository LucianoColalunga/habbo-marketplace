/** Marca propia: una caja isométrica (un furni) con una línea de precio que sube, del color de la sección. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z" fill="#1c2030" stroke="#343a4a" strokeWidth="1" />
      <path d="M16 3 28 9.5 16 16 4 9.5Z" fill="#242a3c" />
      <path d="M16 16v13L4 22.5v-13Z" fill="#151821" />
      <path
        d="M7.5 20.5 12 16.8l3.2 2.4 4.6-5.4 4.7-2.6"
        fill="none"
        className="stroke-accent"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="11.2" r="2" className="fill-accent" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="whitespace-nowrap font-display text-lg font-bold tracking-tight text-text">
        Bomhams <span className="text-accent">Market</span>
      </span>
    </span>
  );
}
