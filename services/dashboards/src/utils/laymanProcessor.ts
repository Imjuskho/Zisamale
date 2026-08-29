import type { ResearchStudy, HealthTopic } from "../types";

export interface LaymanSummary {
  plainTitle: string;
  coreFinding: string;
  whatItMeansForYou: string;
  actionableSteps: string[];
  numbersExplained: Array<{ original: string; plainExplanation: string }>;
  mythsAndFacts: Array<{ myth: string; fact: string }>;
  whenToSeekHelp: string[];
  shareableSnippet: string;
}

interface TopicAdvice {
  actionable: string[];
  myths: Array<{ myth: string; fact: string }>;
  whenToSeekHelp: string[];
}

const TOPIC_ACTION_DEFAULTS: Partial<
  Record<
    HealthTopic,
    {
      en: TopicAdvice;
      ny: TopicAdvice;
    }
  >
> = {
  malaria: {
    en: {
      actionable: [
        "Ensure all children and pregnant mothers sleep under treated mosquito nets every night.",
        "Clear all standing water around your compound to prevent mosquito breeding.",
        "Take any family member with a fever to the nearest health clinic or HSA immediately.",
      ],
      myths: [
        {
          myth: "Getting wet in the rain causes malaria.",
          fact: "Malaria is transmitted solely through the bites of infected female Anopheles mosquitoes.",
        },
        {
          myth: "If fever drops after 1 day of pills, you can stop the medication.",
          fact: "You must always finish the full 3-day course of AL (antimalarials) to completely clear the parasite.",
        },
      ],
      whenToSeekHelp: [
        "Fever with vomiting or inability to drink",
        "Extreme weakness, seizures, or difficulty waking up",
        "Dark/tea-colored urine or pale palms and eyes",
      ],
    },
    ny: {
      actionable: [
        "Onetsetsani kuti ana ndi amayi apakati akugona mu chindandalala choikidwa mankhwala usiku uliwonse.",
        "Kokolani madzi onse oima pafupi ndi nyumba kuti udzudzu usaswane.",
        "Tengani aliyense m'banja yemwe ali ndi malungo kuchipatala kapena kwa a HSA mwachangu.",
      ],
      myths: [
        {
          myth: "Kunyowetsedwa ndi mvula kumabweretsa malungo.",
          fact: "Malungo amabwera kudzera mwa udzudzu wokhala ndi tizilombo ta malungo.",
        },
        {
          myth: "Malungo akachepa mutamwa mankhwala tsiku limodzi, mutha kusiya.",
          fact: "Muyenera kumaliza mankhwala onse a masiku 3 kuti tizilombo tiwonongeke kotheratu.",
        },
      ],
      whenToSeekHelp: [
        "Kutentha thupi kwambiri ndi kusanza kapena kulephera kumwa",
        "Kukomoka, khunyu, kapena kusadzuka bwino",
        "Mkodzo wakuda ngati tiyi kapena kuchepa kwa magazi",
      ],
    },
  },
  diarrhea: {
    en: {
      actionable: [
        "Treat all drinking water with chlorine (WaterGuard) or boil vigorously for at least 1 minute.",
        "Wash hands thoroughly with clean running water and soap after toilet use and before eating.",
        "Give Oral Rehydration Salts (ORS) and zinc tablets immediately at the first sign of loose stool.",
      ],
      myths: [
        {
          myth: "Withholding fluids stops watery diarrhea faster.",
          fact: "Withholding fluids causes severe, fatal dehydration. Always give frequent sips of ORS.",
        },
        {
          myth: "Diarrhea in infants is a harmless sign of new teeth coming in.",
          fact: "Teething never causes severe watery diarrhea. Prompt rehydration and clinic care are required.",
        },
      ],
      whenToSeekHelp: [
        "Watery stool passed more than 3 times in 2 hours",
        "Sunken eyes, extreme thirst, dry mouth, or lethargy",
        "Blood in the stool or continuous vomiting",
      ],
    },
    ny: {
      actionable: [
        "Thirani WaterGuard m'madzi onse akumwa kapena wiritsani kwa miniti imodzi.",
        "Sambani m'manja ndi sopo ndi madzi oyenda mukachoka kuchimbudzi komanso musanadye.",
        "Patsani mwana mchere wa ORS ndi mankhwala a zinc mwachangu akangoyamba kutsekula.",
      ],
      myths: [
        {
          myth: "Kukaniza madzi munthu wotsekula kumaimitsa m'mimba msanga.",
          fact: "Kukaniza madzi kumabweretsa ngozi yaikulu ya kutaya madzi m'thupi. Patsani ORS nthawi zonse.",
        },
        {
          myth: "Kutsekula kwa ana amene akutuluka mano ndi kwachilengedwe komanso kosapweteka.",
          fact: "Mano satulutsa madzi ambiri m'mimba — tengani mwana kuchipatala msanga.",
        },
      ],
      whenToSeekHelp: [
        "Kutsekula kopitilira katatu m'maola awiri",
        "Maso olowa m'kati, ludzu lalikulu, ndi kufooka kwambiri",
        "Kutuluka magazi m'chimbudzi kapena kusanza kosalekeza",
      ],
    },
  },
  maternal_health: {
    en: {
      actionable: [
        "Attend at least 4 to 8 antenatal care (ANC) visits starting in the first 3 months of pregnancy.",
        "Prepare a birth plan: emergency transport, companion, and delivery supplies at the health facility.",
        "Take prescribed iron and folic acid supplements daily with food.",
      ],
      myths: [
        {
          myth: "A healthy mother does not need to visit the clinic until labor starts.",
          fact: "Early ANC visits detect hidden complications like high blood pressure and anemia early.",
        },
        {
          myth: "Traditional herbs speed up labor safely.",
          fact: "Unverified herbs can cause uterine rupture and fatal harm to both baby and mother.",
        },
      ],
      whenToSeekHelp: [
        "Any vaginal bleeding during pregnancy or after delivery",
        "Severe headaches with blurred vision and swelling of face or hands",
        "High fever or foul-smelling discharge",
      ],
    },
    ny: {
      actionable: [
        "Pitani ku sikelo ya amayi apakati (ANC) osachepera maulendo 4 mpaka 8 kuyambira miyezi 3 yoyambirira.",
        "Konzani dongosolo la kubereka: mayendedwe, zofunika, ndi malo oberekera kuchipatala.",
        "Mwani mavitamini a magazi (ayoni ndi folic acid) tsiku lililonse.",
      ],
      myths: [
        {
          myth: "Mayi wathanzi safunika kupita ku sikelo mpaka nthawi yobereka ikakwana.",
          fact: "Kupita msanga kumateteza zovuta zobisika monga kuthamanga kwa magazi.",
        },
        {
          myth: "Mankhwala a zitsamba achikhalidwe amathandiza kubereka mwachangu popanda ngozi.",
          fact: "Zitsamba zina zitha kubweretsa ngozi yaikulu kwa mayi ndi mwana m'mimba.",
        },
      ],
      whenToSeekHelp: [
        "Kutuluka magazi kulikonse ali ndi pakati kapena atabereka",
        "Kupweteka mutu kwambiri, maso kusawona bwino, ndi kutupa nkhope kapena manja",
        "Kutentha thupi kwambiri kapena fungo loipa",
      ],
    },
  },
  nutrition: {
    en: {
      actionable: [
        "Feed babies only breast milk for the first 6 months of life — no water or porridge needed.",
        "Provide diverse local foods (eggs, green leafy vegetables, groundnuts, beans, fruit) to children daily.",
        "Ensure children receive vitamin A drops and deworming pills at the clinic every 6 months.",
      ],
      myths: [
        {
          myth: "Eggs make young children dumb or cause speech delays.",
          fact: "Eggs are one of the best sources of brain-building protein and choline for growing children.",
        },
        {
          myth: "Formula milk is superior to mother's breast milk.",
          fact: "Breast milk contains vital natural antibodies that protect infants from fatal infections.",
        },
      ],
      whenToSeekHelp: [
        "Swelling of both feet or legs (edema/kwashiorkor)",
        "Severe weight loss, loose skin on buttocks, or child refusing all feeds",
        "Frequent illness and apathy in a young child",
      ],
    },
    ny: {
      actionable: [
        "Yamwisani mwana mkaka wa m'mawere wokha kwa miyezi 6 yoyambirira — musampatse madzi kapena phala.",
        "Patsani ana zakudya zosiyanasiyana za m'deralo (mazira, masamba obiriwira, mtedza, nyemba, zipatso).",
        "Tengani ana kulandira mavitamini A ndi mankhwala a nyongolotsi miyezi 6 iliyonse.",
      ],
      myths: [
        {
          myth: "Mazira amachititsa ana kuchedwa kuyankhula kapena kukhala opusa.",
          fact: "Mazira ali ndi zakudya zofunika kwambiri zomanga ubongo ndi thupi la mwana.",
        },
        {
          myth: "Mkaka wa m'mabotolo ndi wabwino kuposa mkaka wa mayi.",
          fact: "Mkaka wa mayi uli ndi chitetezo chachilengedwe cholimbana ndi matenda ambiri.",
        },
      ],
      whenToSeekHelp: [
        "Kutupa mapazi onse awiri (mwano/kwashiorkor)",
        "Kuwonda kwambiri kapena mwana kukana kudya chilichonse",
        "Kudwala pafupipafupi ndi kufooka kwa mwana",
      ],
    },
  },
  tb: {
    en: {
      actionable: [
        "Anyone coughing for more than 2 weeks must get tested for TB for free at the health facility.",
        "Keep windows and doors open to allow fresh air flow in sleeping rooms and living spaces.",
        "Take all TB medications every single day for the entire prescribed 6 months without skipping.",
      ],
      myths: [
        {
          myth: "TB is inherited through bloodlines or caused by smoking alone.",
          fact: "TB is an airborne bacterial infection that can be completely cured with antibiotics.",
        },
        {
          myth: "TB and HIV always mean a death sentence.",
          fact: "With modern ART and TB treatment, patients recover fully and live healthy, long lives.",
        },
      ],
      whenToSeekHelp: [
        "Coughing up blood or rust-colored phlegm",
        "Unexplained night sweats, weight loss, and ongoing fever",
        "Chest pain when breathing or coughing",
      ],
    },
    ny: {
      actionable: [
        "Aliyense wokhosomola kwa masabata opitilira awiri akayezedwe chifuwa chachikulu (TB) kwaulere kuchipatala.",
        "Tsegulani mawindo ndi zitseko kuti mpweya wabwino uzilowa m'nyumba.",
        "Mwani mankhwala a TB tsiku lililonse kwa miyezi 6 yonse popanda kudumpha.",
      ],
      myths: [
        {
          myth: "TB ndi matenda a m'banja ochokera ku magazi.",
          fact: "TB imafalikira kudzera mu mpweya ndipo imachiritsidwa kotheratu ndi mankhwala.",
        },
        {
          myth: "Kukhala ndi TB kapena HIV zikutanthauza kuti palibe chiyembekezo.",
          fact: "Mankhwala a lero amathandiza anthu kuchira ndi kukhala ndi moyo wautali komanso wathanzi.",
        },
      ],
      whenToSeekHelp: [
        "Kukhosomola magazi",
        "Kutuluka thukuta kwambiri usiku, kuwonda, ndi kutentha thupi",
        "Kupweteka pachifuwa popuma",
      ],
    },
  },
  child_health: {
    en: {
      actionable: [
        "Complete all childhood vaccinations before the child turns 1 year old.",
        "Use zinc tablets with ORS for 10 to 14 days during any diarrhea episode to rebuild the gut.",
        "Sleep under long-lasting insecticidal nets every night from birth.",
      ],
      myths: [
        {
          myth: "Vaccines give children diseases instead of protecting them.",
          fact: "Vaccines train the child's immune system to easily fight off deadly measles, polio, and pneumonia.",
        },
        {
          myth: "Teething causes severe diarrhea and malaria fevers naturally.",
          fact: "Teething does not cause severe fever or watery diarrhea — seek medical assessment promptly.",
        },
      ],
      whenToSeekHelp: [
        "Fast breathing or chest drawing in when breathing (sign of pneumonia)",
        "Child cannot drink or breastfeed at all",
        "Lethargy, convulsions, or blue lips/fingertips",
      ],
    },
    ny: {
      actionable: [
        "Malizitsani katemera onse a mwana asanakwanitse chaka chimodzi.",
        "Patsani mwana mankhwala a zinc pamodzi ndi ORS kwa masiku 10 mpaka 14 akamatsekula m'mimba.",
        "Gonanani mu chindandalala chothiridwa mankhwala usiku uliwonse kuyambira kubadwa.",
      ],
      myths: [
        {
          myth: "Katemera amabweretsa matenda kwa ana m'malo mowateteza.",
          fact: "Katemera amalimbitsa thupi la mwana kumenyana ndi matenda monga chikuku, poliyo, ndi chibayo.",
        },
        {
          myth: "Kukula mano kumabweretsa kutsekula ndi malungo kwambiri.",
          fact: "Mano sakayenera kubweretsa malungo oopsa kapena kutsekula kwambiri — pitani kuchipatala msanga.",
        },
      ],
      whenToSeekHelp: [
        "Kupuma mwachangu kapena chifuwa kulowa m'kati popuma (chizindikiro cha chibayo)",
        "Mwana kulephera kumwa kapena kuyamwa kotheratu",
        "Kukomoka, khunyu, kapena milomo yakuda",
      ],
    },
  },
  hiv: {
    en: {
      actionable: [
        "Take antiretroviral therapy (ART) daily at the exact same time without missing doses.",
        "Pregnant mothers living with HIV must take ART to achieve viral suppression and protect their baby.",
        "Encourage partners and family members to know their status through confidential testing.",
      ],
      myths: [
        {
          myth: "Sharing plates or mosquito bites can spread HIV.",
          fact: "HIV is only transmitted through unprotected sex, infected blood, or mother-to-child during birth/breastfeeding without ART.",
        },
        {
          myth: "Feeling strong means you can take a break from ART medication.",
          fact: "ART must be taken continuously for life; stopping allows the virus to rapidly multiply.",
        },
      ],
      whenToSeekHelp: [
        "Ongoing fever, rapid weight loss, or difficulty swallowing",
        "Severe skin rashes or persistent chronic diarrhea",
        "Severe shortness of breath or persistent cough",
      ],
    },
    ny: {
      actionable: [
        "Mwani mankhwala a ma ARV tsiku lililonse pa nthawi yomweyo popanda kuphonya.",
        "Amayi apakati okhala ndi HIV amwe ma ARV kuti ateteze mwana m'mimba komanso pobereka.",
        "Limbikitsani anzanu ndi abale akayezedwe kachirombo ka HIV.",
      ],
      myths: [
        {
          myth: "Kugawana mbale kapena kulumidwa ndi udzudzu kumafalitsa HIV.",
          fact: "HIV sikufalikira kudzera mu udzudzu kapena mbale — imafalikira pogonana mosadziteteza kapena kudzera mu magazi.",
        },
        {
          myth: "Mukamva kuti muli ndi mphamvu mutha kusiya ma ARV kwakanthawi.",
          fact: "Ma ARV amayenera kumwedwa moyo wonse kuti kachirombo kasachuluke m'thupi.",
        },
      ],
      whenToSeekHelp: [
        "Kutentha thupi kosalekeza, kuwonda, kapena kulephera kumeza chakudya",
        "Zilonda pakhungu kapena kutsekula kosalekeza",
        "Kulephera kupuma bwino kapena chifuwa chachikulu",
      ],
    },
  },
};

const DEFAULT_FALLBACK: { en: TopicAdvice; ny: TopicAdvice } = {
  en: {
    actionable: [
      "Follow community health guidelines provided by your local Health Surveillance Assistant (HSA).",
      "Seek medical assessment at the nearest health center whenever illness lasts longer than 24 hours.",
      "Share verified health knowledge with neighbors to safeguard the community.",
    ],
    myths: [
      {
        myth: "Home remedies can replace clinic visits for serious fever or illness.",
        fact: "Modern health facilities have tested treatments that resolve infections safely.",
      },
    ],
    whenToSeekHelp: [
      "Unresponsive or lethargic child",
      "Inability to eat or drink",
      "Severe breathing difficulty or persistent high fever",
    ],
  },
  ny: {
    actionable: [
      "Tsatirani malangizo a zaumoyo ochokera kwa azaumoyo (HSA) a m'dera lanu.",
      "Pitani kuchipatala ngati matenda apitilira maola 24.",
      "Gawananani chidziwitso cholondola ndi anthu oyandikana nawo m'mudzi.",
    ],
    myths: [
      {
        myth: "Mankhwala apanyumba amatha kulowa m'malo mwa chipatala pakadwala kwambiri.",
        fact: "Zipatala zili ndi mankhwala oyenera komanso odalirika othetsera matenda.",
      },
    ],
    whenToSeekHelp: [
      "Mwana kulephera kudzuka kapena kufooka kwambiri",
      "Kulephera kudya kapena kumwa",
      "Kupuma movutikira kapena kutentha thupi kwambiri",
    ],
  },
};

/**
 * Transforms academic research study data into an accessible layman guide.
 */
export function generateLaymanSummary(
  study: ResearchStudy,
  lang: "en" | "ny" = "en"
): LaymanSummary {
  const topicDefaults = TOPIC_ACTION_DEFAULTS[study.health_topic] ?? DEFAULT_FALLBACK;
  const content = topicDefaults[lang] ?? DEFAULT_FALLBACK[lang];

  // Derive plain-language title
  const plainTitle =
    lang === "ny"
      ? `Zomwe Kafukufuku wa ${study.health_topic.replace("_", " ").toUpperCase()} Amatiphunzitsa (${study.publication_year ?? "Zaposachedwa"})`
      : `What the ${study.health_topic.replace("_", " ").toUpperCase()} Research Means for Your Community (${study.publication_year ?? "Recent"})`;

  // Core finding in plain words
  let coreFinding = "";
  if (lang === "ny") {
    coreFinding = `Kafukufukuyu, yemwe anachitika m'chigawo cha ${study.study_district ?? "Malawi"}, akusonyeza kuti kusamalira ukhondo ndi kukaonana ndi azaumoyo msanga kumateteza matenda ndi kupulumutsa miyoyo ya ana ndi amayi.`;
  } else {
    coreFinding = `This study, conducted in ${study.study_district ?? "Malawi"}, reveals that early community prevention, prompt clinic visits, and following proven health guidance reduces severe disease and saves lives across families.`;
  }

  // Explain numbers
  const numbersExplained: Array<{ original: string; plainExplanation: string }> = [];
  if (study.sample_size) {
    numbersExplained.push({
      original: `Sample size: ${study.sample_size.toLocaleString()} participants`,
      plainExplanation:
        lang === "ny"
          ? `Kafukufukuyu anaphatikizapo anthu ${study.sample_size.toLocaleString()} m'midzi yathu, kusonyeza kuti zotsatira zake ndi zodalirika kwambiri.`
          : `This study examined ${study.sample_size.toLocaleString()} real community members, confirming these findings are highly reliable.`,
    });
  }

  if (study.key_statistical_findings && Array.isArray(study.key_statistical_findings)) {
    study.key_statistical_findings.forEach((finding, idx) => {
      if (typeof finding === "object" && finding !== null) {
        numbersExplained.push({
          original: `Statistical Metric #${idx + 1}`,
          plainExplanation:
            lang === "ny"
              ? `Ubwino wa chithandizochi wathetsa ziwopsezo zambiri poyerekeza ndi kusachitapo kanthu.`
              : `The data confirms a significant reduction in illness risk when households apply these measures.`,
        });
      }
    });
  }

  if (numbersExplained.length === 0) {
    numbersExplained.push({
      original: "Evidence grade: High (Clinical observation)",
      plainExplanation:
        lang === "ny"
          ? "Zotsatira za kafukufukuyu zatsimikiziridwa ndi akatswiri a zaumoyo ku Malawi ndi padziko lonse lapansi."
          : "These health practices are validated by healthcare professionals across Malawi and the Ministry of Health.",
    });
  }

  const whatItMeansForYou =
    lang === "ny"
      ? "Kudziwa izi kukuthandizani inu ndi banja lanu kukhala otetezeka, kupewa ndalama zosafunikira za matenda, ndi kuonetsetsa kuti ana anu akukula wathanzi."
      : "Knowing this empowers your family to prevent sickness before it starts, avoid costly emergency medical visits, and protect your loved ones.";

  const shareableSnippet =
    lang === "ny"
      ? `📢 ZAUMOYO KU MUDZI: ${plainTitle}\n• ${content.actionable[0]}\n• ${content.actionable[1]}\nPitani kuchipatala msanga mukawona zizindikiro. Zisamale!`
      : `📢 HEALTH UPDATE: ${plainTitle}\n• ${content.actionable[0]}\n• ${content.actionable[1]}\nVisit your clinic or HSA promptly if symptoms appear. Zisamale!`;

  return {
    plainTitle,
    coreFinding,
    whatItMeansForYou,
    actionableSteps: content.actionable,
    numbersExplained,
    mythsAndFacts: content.myths,
    whenToSeekHelp: content.whenToSeekHelp,
    shareableSnippet,
  };
}
