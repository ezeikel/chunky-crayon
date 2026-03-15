import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Blog | Coloring Habitat",
  description: "Tips, techniques, and inspiration for mindful coloring.",
};

const BlogPage = () => {
  return (
    <>
      <Header />
      <main className="bg-background py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tips, techniques, and inspiration for mindful coloring.
          </p>

          {/* TODO: Connect to Sanity CMS or separate blog data source */}
          <div className="mt-16 rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-lg font-semibold text-foreground">Coming soon</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;re working on articles about the science of coloring for
              wellness, technique guides, and creative inspiration.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BlogPage;
