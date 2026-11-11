import { useLocale } from "@/contexts/LocaleContext";
import { applyConsent, readConsent } from "@/lib/analyticsConsent";
import { LEGAL_PATHS } from "@/lib/navigation";
import { ArrowLeft } from "lucide-react";
import React, { useState } from "react";
import { Link } from "wouter";

export type LegalDocument = "terms" | "privacy" | "legal";

type Section = { heading: string; body: string[] };

/**
 * Terms, privacy policy and legal notice.
 *
 * These are the operator-facing baseline the product needs before opening: they
 * state what is collected and why, what TrailConnect does *not* guarantee, and
 * how to exercise the rights Law 25 grants. The placeholders marked
 * "À COMPLÉTER" are the facts only the operator can supply — they must be
 * filled, and the whole text reviewed by a lawyer, before going live.
 */

const OPERATOR_PLACEHOLDER = "[À COMPLÉTER : raison sociale et adresse]";
const CONTACT_PLACEHOLDER = "[À COMPLÉTER : adresse courriel de contact]";

function documents(fr: boolean): Record<
  LegalDocument,
  { title: string; updated: string; sections: Section[] }
> {
  if (fr)
    return {
      terms: {
        title: "Conditions d’utilisation",
        updated: "Version du 2 septembre 2026",
        sections: [
          {
            heading: "1. Objet",
            body: [
              "TrailConnect est un outil de coordination entre personnes qui organisent ou rejoignent des sorties de plein air. TrailConnect met en relation, met à disposition des outils d’organisation et diffuse les informations saisies par les organisateurs.",
              "TrailConnect n’organise pas les sorties, ne les encadre pas, n’emploie pas les organisateurs et ne fournit aucun service de guide.",
            ],
          },
          {
            heading: "2. Votre responsabilité en montagne",
            body: [
              "Chaque personne demeure seule responsable de sa décision de participer, de son équipement, de sa condition physique et de son comportement sur le terrain.",
              "Les niveaux de difficulté, les repères de terrain, les statuts d’accès et les aperçus météo affichés sont indicatifs. Ils proviennent de déclarations d’organisateurs ou de modèles de prévision, peuvent être inexacts ou périmés, et ne constituent ni une garantie, ni un avis officiel, ni une autorisation d’accès.",
              "Vérifiez toujours les sources officielles locales avant de partir. En cas d’urgence, composez le 911.",
              "TrailConnect ne remplace ni les services d’urgence, ni un encadrement professionnel, ni votre propre préparation.",
            ],
          },
          {
            heading: "3. Compte et conduite",
            body: [
              "Vous devez avoir 18 ans ou plus, fournir des informations exactes et ne pas usurper l’identité d’autrui.",
              "Sont interdits : le harcèlement, la fraude, les contenus illicites, la mise en danger délibérée d’autrui et la collecte des données des autres membres à des fins étrangères à une sortie.",
              "Un manquement peut entraîner la suspension ou la fermeture du compte.",
            ],
          },
          {
            heading: "4. Contenus que vous publiez",
            body: [
              "Vous conservez vos droits sur vos contenus et accordez à TrailConnect une licence limitée d’affichage aux seules fins de faire fonctionner le service.",
              "Les contenus signalés peuvent être masqués le temps d’un examen.",
            ],
          },
          {
            heading: "5. Limitation de responsabilité",
            body: [
              "Dans les limites permises par la loi, TrailConnect n’est pas responsable des dommages résultant d’une sortie, du comportement d’un participant, de l’exactitude des informations publiées par les organisateurs, ni d’une interruption du service.",
              "Rien dans ces conditions n’écarte une responsabilité qui ne peut légalement l’être.",
            ],
          },
          {
            heading: "6. Droit applicable",
            body: [
              "Les présentes conditions sont régies par le droit applicable au Québec (Canada).",
              `Exploitant : ${OPERATOR_PLACEHOLDER}. Contact : ${CONTACT_PLACEHOLDER}.`,
            ],
          },
        ],
      },
      privacy: {
        title: "Politique de confidentialité",
        updated: "Version du 2 septembre 2026",
        sections: [
          {
            heading: "1. Responsable des renseignements personnels",
            body: [
              `${OPERATOR_PLACEHOLDER}, joignable à ${CONTACT_PLACEHOLDER}, est responsable de la protection des renseignements personnels au sens de la Loi 25.`,
            ],
          },
          {
            heading: "2. Ce que nous recueillons et pourquoi",
            body: [
              "Compte : nom, adresse courriel et méthode de connexion — pour vous identifier et sécuriser l’accès.",
              "Profil : niveau déclaré, ville, préférences, visibilité choisie — pour vous proposer des sorties adaptées et permettre aux autres membres de vous reconnaître.",
              "Sorties : inscriptions, messages de groupe, listes de matériel, covoiturage — pour organiser la sortie.",
              "Position en temps réel : uniquement pendant une sortie, uniquement si vous l’activez, uniquement auprès du groupe concerné, et arrêtable à tout moment.",
              "Contacts d’urgence et plan d’urgence : uniquement si vous les saisissez, et accessibles aux seules personnes qui organisent la sortie.",
              "Mesure d’audience : uniquement après votre consentement, et retirable ci-dessous.",
            ],
          },
          {
            heading: "3. Renseignements sensibles",
            body: [
              "La position et les contacts d’urgence sont des renseignements sensibles. Ils font l’objet d’un consentement distinct, ne sont jamais activés par défaut, ne sont pas vendus et ne servent à aucune autre finalité.",
            ],
          },
          {
            heading: "4. Communication à des tiers",
            body: [
              "Nous ne vendons aucun renseignement personnel.",
              "Les données sont partagées avec les autres membres seulement dans la mesure que vous choisissez (visibilité du profil, participation à une sortie).",
              "Des prestataires techniques (hébergement, cartographie, prévisions météo) traitent certaines données pour notre compte, strictement pour faire fonctionner le service.",
            ],
          },
          {
            heading: "5. Conservation",
            body: [
              "Les données de compte sont conservées tant que le compte existe. À sa suppression, un délai de grâce s’applique, puis les données sont supprimées ou anonymisées.",
              "L’historique nécessaire à la sécurité et à la modération peut être conservé plus longtemps lorsque la loi l’exige.",
            ],
          },
          {
            heading: "6. Vos droits",
            body: [
              "Vous pouvez consulter, corriger, exporter ou faire supprimer vos renseignements, retirer un consentement et porter plainte auprès de la Commission d’accès à l’information du Québec.",
              `Écrivez à ${CONTACT_PLACEHOLDER}. Les demandes d’accès et de suppression se font aussi depuis « Mon espace ».`,
            ],
          },
        ],
      },
      legal: {
        title: "Mentions légales",
        updated: "Version du 2 septembre 2026",
        sections: [
          {
            heading: "Éditeur",
            body: [
              `${OPERATOR_PLACEHOLDER}`,
              `Contact : ${CONTACT_PLACEHOLDER}`,
            ],
          },
          {
            heading: "Hébergement",
            body: ["[À COMPLÉTER : hébergeur et localisation des serveurs]"],
          },
          {
            heading: "Nature du service",
            body: [
              "TrailConnect est un outil de coordination entre particuliers. Il n’organise ni n’encadre les sorties publiées, et ne fournit aucune prestation de guide.",
            ],
          },
          {
            heading: "Signalement",
            body: [
              "Tout contenu ou comportement problématique peut être signalé depuis la fiche de la sortie concernée, ou écrit à l’adresse ci-dessus.",
            ],
          },
        ],
      },
    };

  return {
    terms: {
      title: "Terms of use",
      updated: "Version of 2 September 2026",
      sections: [
        {
          heading: "1. What TrailConnect is",
          body: [
            "TrailConnect is a coordination tool between people who organize or join outdoor outings. It connects people, provides organizing tools and displays what organizers enter.",
            "TrailConnect does not organize outings, does not supervise them, does not employ organizers and provides no guiding service.",
          ],
        },
        {
          heading: "2. Your responsibility in the mountains",
          body: [
            "Each person remains solely responsible for their decision to take part, their equipment, their fitness and their conduct in the field.",
            "Difficulty levels, terrain landmarks, access statuses and weather outlooks are indicative. They come from organizer statements or forecast models, may be inaccurate or out of date, and are neither a guarantee, an official advisory, nor an access authorization.",
            "Always check official local sources before setting out. In an emergency, call 911.",
            "TrailConnect replaces neither emergency services, nor professional supervision, nor your own preparation.",
          ],
        },
        {
          heading: "3. Account and conduct",
          body: [
            "You must be 18 or older, provide accurate information and not impersonate anyone.",
            "Harassment, fraud, unlawful content, deliberately endangering others and harvesting other members' data for purposes unrelated to an outing are prohibited.",
            "Breaches may lead to suspension or closure of the account.",
          ],
        },
        {
          heading: "4. Content you post",
          body: [
            "You keep your rights in your content and grant TrailConnect a limited licence to display it solely to operate the service.",
            "Reported content may be hidden while it is reviewed.",
          ],
        },
        {
          heading: "5. Limitation of liability",
          body: [
            "To the extent permitted by law, TrailConnect is not liable for damage arising from an outing, from a participant's conduct, from the accuracy of information published by organizers, or from an interruption of the service.",
            "Nothing here excludes liability that cannot lawfully be excluded.",
          ],
        },
        {
          heading: "6. Governing law",
          body: [
            "These terms are governed by the law applicable in Quebec, Canada.",
            `Operator: ${OPERATOR_PLACEHOLDER}. Contact: ${CONTACT_PLACEHOLDER}.`,
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy policy",
      updated: "Version of 2 September 2026",
      sections: [
        {
          heading: "1. Who is responsible",
          body: [
            `${OPERATOR_PLACEHOLDER}, reachable at ${CONTACT_PLACEHOLDER}, is the person responsible for the protection of personal information under Quebec's Law 25.`,
          ],
        },
        {
          heading: "2. What we collect and why",
          body: [
            "Account: name, email address and sign-in method — to identify you and secure access.",
            "Profile: stated level, town, preferences, chosen visibility — to suggest suitable outings and let other members recognize you.",
            "Outings: registrations, group messages, packing lists, carpooling — to run the outing.",
            "Live location: only during an outing, only if you turn it on, only with the group concerned, and stoppable at any time.",
            "Emergency contacts and emergency plan: only if you enter them, and visible only to the people organizing the outing.",
            "Usage measurement: only after your consent, withdrawable below.",
          ],
        },
        {
          heading: "3. Sensitive information",
          body: [
            "Location and emergency contacts are sensitive information. They require separate consent, are never on by default, are never sold and serve no other purpose.",
          ],
        },
        {
          heading: "4. Sharing",
          body: [
            "We do not sell personal information.",
            "Data is shared with other members only to the extent you choose (profile visibility, joining an outing).",
            "Technical providers (hosting, mapping, weather forecasts) process some data on our behalf, strictly to operate the service.",
          ],
        },
        {
          heading: "5. Retention",
          body: [
            "Account data is kept while the account exists. On deletion a grace period applies, then data is deleted or anonymized.",
            "History needed for safety and moderation may be kept longer where the law requires it.",
          ],
        },
        {
          heading: "6. Your rights",
          body: [
            "You may access, correct, export or have your information deleted, withdraw a consent, and complain to Quebec's Commission d'accès à l'information.",
            `Write to ${CONTACT_PLACEHOLDER}. Access and deletion requests can also be made from "My space".`,
          ],
        },
      ],
    },
    legal: {
      title: "Legal notice",
      updated: "Version of 2 September 2026",
      sections: [
        {
          heading: "Publisher",
          body: [`${OPERATOR_PLACEHOLDER}`, `Contact: ${CONTACT_PLACEHOLDER}`],
        },
        {
          heading: "Hosting",
          body: ["[TO COMPLETE: host and server location]"],
        },
        {
          heading: "Nature of the service",
          body: [
            "TrailConnect is a coordination tool between individuals. It neither organizes nor supervises the outings published on it, and provides no guiding service.",
          ],
        },
        {
          heading: "Reporting",
          body: [
            "Any problematic content or conduct can be reported from the outing concerned, or by writing to the address above.",
          ],
        },
      ],
    },
  };
}

export function LegalPage({ document: name }: { document: LegalDocument }) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const content = documents(fr)[name];
  const [consent, setConsent] = useState<"granted" | "denied" | null>(() =>
    readConsent()
  );

  const withdraw = (choice: "granted" | "denied") => {
    applyConsent(choice);
    setConsent(choice);
  };

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl bg-[#f8fbf4] px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-1.5 text-xs font-extrabold text-[#3d6a53]"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {fr ? "Retour à l’application" : "Back to the app"}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-[-.05em] text-[#1d3e31]">
        {content.title}
      </h1>
      <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#769182]">
        {content.updated}
      </p>

      <div className="mt-7 space-y-6">
        {content.sections.map(section => (
          <section key={section.heading}>
            <h2 className="text-base font-extrabold tracking-[-.03em] text-[#28503e]">
              {section.heading}
            </h2>
            {section.body.map((paragraph, index) => (
              <p
                key={index}
                className="mt-2 text-sm leading-relaxed font-medium text-[#4d6a5c]"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      {name === "privacy" && (
        <section className="mt-8 rounded-[1.45rem] border border-[#dce9d8] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#28503e]">
            {fr ? "Votre choix de mesure d’audience" : "Your measurement choice"}
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-[#647f71]">
            {consent === "granted"
              ? fr
                ? "La mesure d’audience est actuellement activée."
                : "Usage measurement is currently enabled."
              : consent === "denied"
                ? fr
                  ? "La mesure d’audience est actuellement refusée."
                  : "Usage measurement is currently declined."
                : fr
                  ? "Vous n’avez pas encore fait de choix."
                  : "You have not made a choice yet."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => withdraw("granted")}
              className="min-h-11 rounded-xl bg-[#1d493a] px-4 text-xs font-extrabold text-white"
            >
              {fr ? "Accepter" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => withdraw("denied")}
              className="min-h-11 rounded-xl border border-[#cddcc7] bg-white px-4 text-xs font-extrabold text-[#3d6a53]"
            >
              {fr ? "Retirer mon consentement" : "Withdraw my consent"}
            </button>
          </div>
        </section>
      )}

      <nav className="mt-10 flex flex-wrap gap-4 border-t border-[#dfe9dc] pt-5 text-xs font-bold text-[#5c7f6d]">
        <Link href={LEGAL_PATHS.terms} className="underline underline-offset-4">
          {fr ? "Conditions d’utilisation" : "Terms of use"}
        </Link>
        <Link
          href={LEGAL_PATHS.privacy}
          className="underline underline-offset-4"
        >
          {fr ? "Politique de confidentialité" : "Privacy policy"}
        </Link>
        <Link href={LEGAL_PATHS.legal} className="underline underline-offset-4">
          {fr ? "Mentions légales" : "Legal notice"}
        </Link>
      </nav>
    </main>
  );
}

export default LegalPage;
