import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="AMPERE home">
      <Image
        src="/brand/ampere-mark.png"
        width={44}
        height={44}
        alt=""
        priority
      />
      <span>AMPERE</span>
    </Link>
  );
}
