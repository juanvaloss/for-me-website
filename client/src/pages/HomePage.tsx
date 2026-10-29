import { Closing } from "../components/home/Closing";
import { Collection } from "../components/home/Collection";
import { DropStrip } from "../components/home/DropStrip";
import { Founders } from "../components/home/Founders";
import { Hero } from "../components/home/Hero";
import { Principles } from "../components/home/Principles";
import { Story } from "../components/home/Story";
import { ValuesMarquee } from "../components/home/ValuesMarquee";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function HomePage() {
  useDocumentTitle("forme · activewear");

  return (
    <>
      <Hero />
      <DropStrip />
      <Story />
      <Founders />
      <ValuesMarquee />
      <Principles />
      <Collection />
      <Closing />
    </>
  );
}
