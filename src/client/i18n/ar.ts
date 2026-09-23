/**
 * Arabic UI copy for the public site. Mirrors `en.ts` key-for-key — `Dict`
 * comes from there, so a missing key fails `bun run typecheck`.
 *
 * Tone: Modern Standard Arabic, concise. Brand name (GlobalHilal) and API
 * identifiers stay Latin. Numerals are rendered as Arabic-Indic digits by
 * the display helpers in `./format`, not baked into these strings.
 */
import type { Dict } from "./en";

export const ar: Dict = {
	langName: "العربية",
	nav: {
		aria: "التنقل الرئيسي",
		today: "اليوم",
		calendar: "التقويم",
		contribute: "شارك رؤيتك",
		methodology: "المنهجية",
		sources: "المصادر",
		docs: "توثيق الواجهة",
	},
	header: {
		signIn: "تسجيل الدخول",
		dashboard: "لوحة التحكم",
		language: "اللغة",
	},
	footer: {
		tagline:
			"رؤية هلال واحدة صحيحة في أي مكان تبدأ الشهر للجميع. قائمة على الشهادة، لا على التوقع.",
		site: "الموقع",
		developers: "للمطورين",
		todayDate: "تاريخ اليوم",
		calendar: "التقويم",
		methodology: "المنهجية",
		freeApi: "الواجهة المجانية",
		sources: "المصادر",
		reportSighting: "أبلغ عن رؤية",
	},
	status: {
		draft: "مسودة",
		provisional: "مبدئي",
		confirmed: "مؤكد",
		corrected: "مُصحَّح",
		awaiting: "بالانتظار",
	} as Record<string, string>,
	result: {
		seen: "رُئي",
		not_seen: "لم يُرَ",
		cloudy: "غائم",
	} as Record<string, string>,
	method: {
		naked_eye: "بالعين المجردة",
		telescope: "بالتلسكوب",
		both: "كلاهما",
		unknown: "غير معروف",
	} as Record<string, string>,
	common: {
		nextWatching: "الترقب القادم للهلال",
		monthDetail: "تفاصيل الشهر",
		readRuling: "اقرأ القرار الكامل والشهادات والمصادر",
		verified: "موثَّق",
		witness: "الشاهد",
		by: "بواسطة",
		eveningOf: (date: string) => `ليلة ${date}`,
		days: (n: string) => `${n} يومًا`,
		hijriYear: (y: string) => `${y} هـ`,
		notFoundTitle: "٤٠٤ — الصفحة غير موجودة",
		notFoundBody: "الصفحة التي تبحث عنها غير موجودة.",
		goHome: "العودة إلى الرئيسية",
	},
	warnings: {
		provisional: "بانتظار التأكيد؛ قد يتغير بعد مزيد من التحقق.",
		unknownTz: (tz: string) =>
			`منطقة زمنية غير معروفة «${tz}» — سيُعرض بتوقيت UTC بدلًا منها.`,
	},
	home: {
		kicker: (date: string, day: string) => `${date} · اليوم ${day} من الشهر`,
		evidence: "الدليل",
		sightedIn: (place: string) => `رُئي في ${place}`,
		sightedInNote: " — وردت الشهادة وتم التحقق منها.",
		nextWatchingNote:
			"في ليلة التاسع والعشرين ينظر الجميع إلى السماء. رؤية صحيحة واحدة في أي مكان تفتح الشهر الجديد للجميع.",
		apiCta:
			"تبني جدول صلاة أو شاشة مسجد؟ خذ التاريخ من الواجهة المجانية —",
		apiCtaLink: "اقرأ التوثيق",
		empty: "لم تُنشر أي قرارات رؤية بعد. عد بعد ليلة الترقب القادمة.",
	},
	today: {
		kicker: "اليوم",
		h1: "ما التاريخ الهجري اليوم؟",
		timezone: "المنطقة الزمنية",
		show: "اعرض",
		sightedIn: "رُئي في:",
		noCoverage:
			"لا يوجد قرار رؤية يغطي هذا التاريخ — التواريخ المستقبلية لا تُتوقع أبدًا.",
		explainer:
			"الشهر واحد للأمة كلها — ومنطقتك الزمنية تحدد فقط أي تاريخ ميلادي تسأل عنه. شهادة تصل متأخرة من قارة أخرى قد تجعل اليوم هو الأول.",
		titleFallback: "اليوم",
	},
	calendar: {
		kicker: "الأرشيف",
		h1: "التقويم الهجري",
		year: "السنة",
		intro:
			"كل شهر أدناه بدأ برؤية مشهودة — أو ما زال ينتظرها. لا شيء هنا محسوب مسبقًا.",
		awaiting: "بانتظار الرؤية — لا شهادة بعد.",
		noData: "لا توجد قرارات منشورة بعد.",
		title: (year: string) => `تقويم سنة ${year} هـ`,
		titleFallback: "التقويم الهجري",
	},
	month: {
		calendarCrumb: "التقويم",
		testimonies: "الشهادات",
		noTestimonies: "لا توجد شهادات منشورة لهذا الشهر.",
		references: "المصادر",
		referencesPending: "المصادر قيد الجمع.",
		title: (month: string, year: string, start: string) =>
			`${month} ${year} — بدأ في ${start}`,
	},
	methodology: {
		kicker: "المنهجية",
		h1: "خمس قواعد تحدد كل تاريخ في هذا الموقع.",
		intro:
			"تُطبَّق بالطريقة نفسها كل شهر، دون استثناء لأي بلد. إذا أدهشك تاريخ هنا، فهذه القواعد تفسر السبب.",
		archiveLead: "انظر أي ",
		archiveLink: "شهر في الأرشيف",
		archiveTail: ". التصحيحات تضيف إلى السجل ولا تكتبه من جديد.",
		title: "المنهجية",
		rules: [
			{
				n: "٠١",
				title: "الشهر يبدأ بشهادة",
				body:
					"عملًا بحديث رسول الله ﷺ — صوموا لرؤيته وأفطروا لرؤيته — يُعلن الشهر الجديد عند وجود شهادة موثوقة برؤية الهلال. وبدون شهادة صحيحة، يُكمل الشهر ثلاثين يومًا.",
			},
			{
				n: "٠٢",
				title: "رؤية واحدة تكفي للعالم كله",
				body:
					"أفق عالمي واحد: رؤية صحيحة واحدة في أي مكان على الأرض تبدأ الشهر لجميع المسلمين. لا نلتزم ببلد بعينه — فالسعودية مصدر من بين مصادر متساوية، وشهادة لجنة في قرية قد تحمل الأمة.",
			},
			{
				n: "٠٣",
				title: "الشهادة فقط — لا توقعات",
				body:
					"لا ننشر أشهرًا محسوبة مسبقًا. التاريخ الوحيد الذي ينظر إلى الأمام هو ليلة الترقب القادمة، ليلة التاسع والعشرين. اطلب أي تاريخ يتجاوز الشهادة المؤكدة وستجيب الواجهة: خارج النطاق.",
			},
			{
				n: "٠٤",
				title: "لا حدّ لليوم",
				body:
					"الشهادة المتأخرة تبقى معتبرة لليوم نفسه. إذا كان الصباح قد طلع على إندونيسيا ووصلت رؤية صحيحة من قارة يحلّ ليلها متأخرًا، فذلك اليوم هو الأول — ويُعدَّل في التاريخ الميلادي نفسه. وقد ينتقل القرار من مبدئي إلى مؤكد خلال اليوم.",
			},
			{
				n: "٠٥",
				title: "الدليل يبقى علنيًا",
				body: "كل صفحة شهر تسمّي شهوده وتربط القرارات التي بُني عليها.",
			},
		],
	},
	sources: {
		kicker: "المصادر",
		h1: "كل قرار مرتبط بما حدث فعلًا.",
		intro:
			"كل شهر نبحث عما وقع حقًا: إعلانات رسمية، ووكالات أنباء رسمية، ووزارات شؤون دينية، ولجان هلال — في أي بلد. أما المجمّعات والمدونات فهي مكمّلة فقط، وليست أساسًا منفردًا.",
		accept: "نقبل",
		items: [
			"إعلانات لجان رؤية الهلال بأسماء الشهود",
			"وكالات الأنباء الرسمية عند إعلان القرار الرسمي",
			"وزارات الشؤون الدينية (إندونيسيا، ماليزيا، بروناي، المغرب، الأردن، …)",
			"لجان الهلال المعترف بها التي تنشر شهاداتها",
		],
		check: "كيف تتحقق منا",
		checkBody1:
			"كل مصدر يذكر ناشره وتاريخ نشره والجملة المقتبسة نفسها. والروابط الميتة تُستبدل بنسخة مؤرشفة.",
		checkBody2Lead: "رأيت الهلال بنفسك؟ ",
		checkBody2Link: "أرسل شهادتك",
		checkBody2Tail:
			" — يتحقق المحررون من كل بلاغ، وتُنشر التصحيحات ولا تُعدَّل سرًا.",
		title: "المصادر",
	},
	docs: {
		kicker: "للمطورين",
		h1: "نقطة واحدة تجيب: ما التاريخ الهجري اليوم؟",
		intro:
			"واجهة JSON مجانية، بلا مفتاح، وCORS مفتوح لطلبات GET. العنوان الأساسي",
		published: (n: string) => `${n} شهرًا منشورًا — والعدّ بالشهادة، لا بالتوقع.`,
		endpoints: [
			{
				method: "GET /today",
				desc: "تاريخ اليوم الهجري. المعاملان tz (IANA، الافتراضي UTC) وdate (YYYY-MM-DD، للاختبار).",
				curl: 'curl "https://globalhilal.org/api/v1/today?tz=Asia/Jakarta"',
			},
			{
				method: "GET /convert",
				desc: "التاريخ الهجري لأي تاريخ ميلادي: ?gregorian=YYYY-MM-DD&tz=…",
				curl: 'curl "https://globalhilal.org/api/v1/convert?gregorian=2026-03-20"',
			},
			{
				method: "GET /months",
				desc: "السجل، الأحدث أولًا. المعاملات hijri_year وstatus وperPage وpage.",
				curl: 'curl "https://globalhilal.org/api/v1/months?hijri_year=1447"',
			},
			{
				method: "GET /months/current · /months/:year/:month",
				desc: "الشهر الجاري، أو التفاصيل الكاملة مع الشهادات والمصادر.",
				curl: 'curl "https://globalhilal.org/api/v1/months/1447/9"',
			},
		],
		errorsLead: "تأتي الأخطاء بالشكل",
		errorsEnvelope: "{ error: { code, message } }",
		errorsCodes: "— INVALID_TZ، INVALID_DATE، NOT_FOUND، OUT_OF_RANGE.",
		errorsTail:
			"التواريخ التي تتجاوز الشهادة المؤكدة تُعيد OUT_OF_RANGE: فالواجهة لا تخمّن المستقبل. والتغييرات الجذرية تُصدر باسم /v2، ويبقى /v1 متاحًا 12 شهرًا على الأقل.",
		title: "توثيق الواجهة",
	},
	contribute: {
		kicker: "شارك",
		h1: "رأيت الهلال؟ أخبر الأمة.",
		intro:
			"شهادة صحيحة واحدة في أي مكان تفتح الشهر للجميع — وقد تكون شهادتك هي. يتحقق المحررون من كل بلاغ قبل اعتماده، وتبقى التفاصيل غير الضرورية خاصة. بلاغ واحد لكل شخص في اليوم.",
		success:
			"جزاكم الله خيرًا — استُلم بلاغكم وهو بانتظار مراجعة المحرر.",
		month: "الشهر المرصود",
		evening: "ليلة الرصد",
		country: "البلد",
		city: "المدينة (اختياري)",
		result: "النتيجة",
		method: "الطريقة",
		name: "اسمك",
		contact: "وسيلة تواصل للمتابعة (اختياري)",
		contactPlaceholder: "بريد إلكتروني أو هاتف",
		note: "ماذا رأيت؟",
		notePlaceholder: "الوقت بعد الغروب، حالة السماء، من كان معك…",
		submit: "أرسل الشهادة",
		sending: "جارٍ الإرسال…",
		readMethodologyLead: "اقرأ ",
		readMethodologyLink: "كيف تُتخذ القرارات",
		readMethodologyTail: " قبل الإبلاغ.",
		resultOptions: {
			seen: "رُئي الهلال",
			not_seen: "بحثت ولم أره",
			cloudy: "غائم — تعذّر الرصد",
		} as Record<string, string>,
		methodOptions: {
			naked_eye: "بالعين المجردة",
			telescope: "تلسكوب / منظار",
			both: "كلاهما",
			unknown: "غير معروف",
		} as Record<string, string>,
		title: "الإبلاغ عن رؤية الهلال",
	},
	meta: {
		homeDescription:
			"تاريخ اليوم الهجري وفق شهادة رؤية الهلال العالمية. رؤية صحيحة واحدة في أي مكان تبدأ الشهر للجميع.",
		todayDescription:
			"تاريخ اليوم الهجري وفق شهادة رؤية الهلال العالمية، بحسب منطقتك الزمنية.",
		calendarDescription:
			"أشهر هجرية وفق شهادة رؤية الهلال العالمية، مع تواريخ البداية والأطوال ومصادر القرار.",
		methodologyDescription:
			"كيف يحدد GlobalHilal الأشهر الهجرية: رؤية هلال عالمية قائمة على الشهادة. رؤية صحيحة واحدة في أي مكان تبدأ الشهر للجميع.",
		sourcesDescription:
			"من أين تأتي قرارات GlobalHilal: إعلانات رسمية، ووكالات أنباء، ووزارات، ولجان هلال حول العالم.",
		docsDescription:
			"واجهة JSON عامة مجانية لتواريخ هجرية قائمة على الشهادة. بلا مصادقة، وCORS مفتوح، وبنسخ /api/v1.",
		contributeDescription:
			"رأيت الهلال؟ أرسل شهادتك إلى GlobalHilal. يتحقق المحررون من كل بلاغ قبل اعتماده.",
	},
};
