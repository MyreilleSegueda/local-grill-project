import Link from "next/link";

export default function Custom404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
      <h1 className="text-6xl font-extrabold text-red-600 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Page inaccessible</h2>
      <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">La page demandée n'existe pas ou vous n'avez pas accès.</p>
      <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Retour à l'accueil</Link>
    </div>
  );
}
