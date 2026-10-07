import Image from "next/image";
import { nstImages } from "@/lib/nst-images";

/** Static empty-state artwork. Never participates in gallery tiles/lightboxes. */
export function NstGalleryEmpty({ message, action }: { message: string; action?: React.ReactNode }) {
  return <div className="nst-gallery-empty">
    <figure>
      <Image src={nstImages.community.src} alt={nstImages.community.alt} sizes="(max-width: 767px) 100vw, 40vw" />
      <figcaption className="tokens-small">From the official NST website</figcaption>
    </figure>
    <div className="nst-empty-copy"><p className="tokens-heading-3">{message}</p><p>Approved event uploads appear here when available. This school photo is a visual welcome.</p>{action}</div>
  </div>;
}
