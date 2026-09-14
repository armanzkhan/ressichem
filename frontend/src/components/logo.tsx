import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-8 max-w-[10.847rem]">
      <Image
        src="/images/logo/logo.png"
        alt="Ressichem logo"
        width={174}
        height={30}
        className="h-8 w-auto"
        priority
      />
    </div>
  );
}
