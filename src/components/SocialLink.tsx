import { communityX } from "@/lib/community";

/** Enlace al perfil de X de la comunidad Bomhams (con el logo de X). */
export function SocialLink({ label }: { label: string }) {
  return (
    <a href={communityX()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-text">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <path fill="currentColor" d="M18.2 2.5h3.4l-7.4 8.5 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9.1L.9 2.5h7l4.8 6.4 5.5-6.4Zm-1.2 18h1.9L7.1 4.4H5.1l11.9 16.1Z" />
      </svg>
      {label}
    </a>
  );
}
