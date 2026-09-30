import { Button, Card, Chip } from "@heroui/react";
import { useRouteError } from "react-router-dom";

function RouteErrorPage() {
  const error = useRouteError();

  const status = error?.status || error?.statusCode || null;
  const message =
    error?.data?.message ||
    error?.message ||
    "Something went wrong while rendering this page.";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
      <Card className="glass w-full max-w-lg rounded-3xl">
        <Card.Header className="flex flex-col items-start gap-2">
          <Chip className="bg-[#fce8df] text-[#9a3e19]" variant="flat">
            Route Error
          </Chip>
          <p className="text-2xl font-semibold">Page failed to load</p>
          <p className="muted text-sm">
            {status ? `Status: ${status}. ` : null}
            {message}
          </p>
        </Card.Header>
        <Card.Content className="space-y-3">
          <Button
            className="w-full bg-[#cb5f31] text-white"
            onPress={() => window.location.reload()}
          >
            Reload
          </Button>
          <Button
            className="w-full border border-black/10 bg-white/75 text-black"
            onPress={() => window.location.assign("/")}
          >
            Go to Dashboard
          </Button>
          <Button
            className="w-full border border-black/10 bg-white/75 text-black"
            onPress={() => window.location.assign("/login")}
          >
            Go to Login
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
}

export default RouteErrorPage;
