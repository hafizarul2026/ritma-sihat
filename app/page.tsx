import RitmaApp from "./RitmaApp";

export const dynamic = "force-dynamic";

export default function Home() {
  return <RitmaApp authUser={null} signInPath="#pelan-ritma" signOutPath="/" />;
}
