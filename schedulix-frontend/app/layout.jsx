import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "../styles/globals.css";

export const metadata = {
  title: "Schedulix",
  description: "Real-time medical appointment scheduling"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        <main className="app-shell mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
