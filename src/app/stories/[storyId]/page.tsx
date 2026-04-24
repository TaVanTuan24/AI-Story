import { AppShell } from "@/components/layout/app-shell";
import { StoryShell } from "@/components/story/story-shell";

type StoryPageProps = {
  params: Promise<{
    storyId: string;
  }>;
};

export default async function StoryPage({ params }: StoryPageProps) {
  const { storyId } = await params;

  return (
    <AppShell>
      <div className="text-ui-muted flex items-center justify-between text-sm">
        <span>Reader shell preview</span>
        <span>Story ID: {storyId}</span>
      </div>
      <StoryShell
        title="The Lantern Beyond Ninth Street"
        genre="Mystery"
        summary="A production UI placeholder showing the future reading experience and the data shape expected from the backend."
        currentScene="Rain glossed the tram tracks silver as Mira unfolded the letter she should never have received. The handwriting matched her missing brother's exactly, right down to the impatient slant of the final word: run."
        choices={[
          { id: "inspect-letter", label: "Study the letter for hidden marks" },
          {
            id: "board-tram",
            label: "Get on the last tram toward Ninth Street",
          },
          {
            id: "call-contact",
            label: "Call the retired detective who knew your brother",
          },
          {
            id: "burn-letter",
            label: "Destroy the letter before anyone else sees it",
          },
        ]}
      />
    </AppShell>
  );
}
