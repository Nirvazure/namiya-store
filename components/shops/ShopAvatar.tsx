"use client";
import Image from "next/image";
import { useState } from "react";
import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";

export function ShopAvatar({ url, name, official = false }: { url?: string | null; name: string; official?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <span className={`shop-avatar ${official ? "shop-avatar-official" : ""}`} aria-hidden="true">
    {(url || official) && !failed ? <Image src={url || "/indoor/optimized/grandpa/keeper.webp"} alt="" width={44} height={44} unoptimized onError={() => setFailed(true)} />
      : name ? <span>{[...name][0]}</span> : <UserCircle size={28} weight="light" />}
  </span>;
}
