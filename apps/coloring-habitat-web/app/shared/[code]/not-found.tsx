import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export default function SharedArtworkNotFound() {
  return (
    <>
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center px-6 py-20">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Artwork Not Found
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            This shared artwork link may have expired or been removed. Shared
            links are only available for a limited time.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Gallery
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </Link>
        </div>
      </main>
    </>
  );
}
