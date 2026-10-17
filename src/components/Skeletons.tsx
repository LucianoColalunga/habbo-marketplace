import { Logo } from "./Logo";

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur" aria-busy="true">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Logo />
        <div className="skeleton hidden h-9 flex-1 md:block" />
        <div className="skeleton ml-auto h-9 w-36" />
      </div>
      <div className="mx-auto h-9 max-w-6xl px-4" />
    </header>
  );
}

export function PageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      {title && <div className="skeleton h-9 w-2/3 max-w-lg" />}
      <div className="skeleton h-4 w-full max-w-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-80" />
    </div>
  );
}
