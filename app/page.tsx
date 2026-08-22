import RitmaApp from "./RitmaApp";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <RitmaApp
      authUser={
        user
          ? { email: user.email, displayName: user.displayName, userId: user.userId }
          : null
      }
      signInPath={chatGPTSignInPath("/")}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}