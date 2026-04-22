import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8">
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Keuzehulp</h1>
      <p className="text-lg text-muted-foreground text-center max-w-md">
        Welcome to the Keuzehulp system. A transparent wizard to receive personal energy contract advice.
      </p>
      <div className="flex space-x-4">
        <Link 
          to="/admin" 
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Go to Admin Panel
        </Link>
      </div>
    </div>
  );
}
