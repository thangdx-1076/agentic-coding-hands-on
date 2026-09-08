import Image from "next/image";

export type KudosImageStripProps = {
  imageUrls: string[];
};

const MAX_IMAGES = 5;
const IMAGE_SIZE = 88;

/**
 * mm:C.3.6_Image đính kèm (`I3127:21871;256:5176`) — feed variant only.
 * Up to 5 thumbnails, 88x88 (`asset-dimensions.md`), left-aligned, 16px gap.
 * Not clickable — the full-image lightbox (`C.3.6`'s "Click ảnh: mở full
 * ảnh lớn") has no built frame yet (clarifications.md § Phạm vi F007).
 */
export function KudosImageStrip({ imageUrls }: KudosImageStripProps) {
  const visible = imageUrls.slice(0, MAX_IMAGES);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="kudos-image-strip"
      className="flex w-full flex-row items-center gap-4"
    >
      {visible.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[18px] border border-[#998C5F] bg-white"
        >
          <Image
            src={url}
            alt=""
            width={IMAGE_SIZE}
            height={IMAGE_SIZE}
            className="h-full w-full rounded object-cover"
          />
        </div>
      ))}
    </div>
  );
}
