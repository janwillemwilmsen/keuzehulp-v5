-- 20260424_contract_type_descriptions.sql
--
-- Seeds (and on re-run, refreshes) the end-user-facing "Uitleg" copy per
-- contract type. These texts appear in a modal on the wizard results page
-- when the user clicks "Uitleg" next to a contract name.
--
-- Editable from /admin/contract-types — running this migration just gives
-- us a sensible baseline so the modal is never empty on a fresh install.

BEGIN;

UPDATE public.contract_types SET description = $md$Bij een variabel contract:

• Worden je energietarieven elke 3 maanden opnieuw vastgesteld
• Profiteer je automatisch als de energieprijzen dalen
• Kunnen je maandelijkse kosten stijgen als de energieprijzen omhoog gaan
• Kun je elke maand wisselen naar een ander soort contract

Dit type contract is geschikt voor mensen die flexibel willen zijn en bereid zijn wat meer risico te nemen in ruil voor mogelijke besparingen.$md$
WHERE slug = 'variabel';

UPDATE public.contract_types SET description = $md$Bij een 1-jarig vast contract:

• Ligt je energietarief voor 1 jaar vast
• Weet je precies wat je elke maand betaalt
• Ben je beschermd tegen prijsstijgingen
• Kun je na 1 jaar wisselen naar een ander soort contract

Dit type contract is ideaal als je zekerheid wilt voor je maandlasten, maar wel de vrijheid wilt hebben om na een jaar te kunnen overstappen.$md$
WHERE slug = 'vast1';

UPDATE public.contract_types SET description = $md$Bij een 2-jarig vast contract:

• Ligt je energietarief voor 2 jaar vast
• Weet je precies wat je elke maand betaalt
• Ben je beschermd tegen prijsstijgingen
• Kun je na 2 jaar wisselen naar een ander soort contract

Dit type contract is ideaal als je zekerheid wilt voor je maandlasten én net wat langer vastigheid wilt dan een jaarcontract, zonder je meteen voor 3 jaar vast te leggen.$md$
WHERE slug = 'vast2';

UPDATE public.contract_types SET description = $md$Bij een 3-jarig vast contract:

• Ligt je energietarief voor 3 jaar vast
• Heb je maximale zekerheid over je energiekosten
• Ben je langdurig beschermd tegen prijsstijgingen
• Betaal je meestal iets meer voor deze zekerheid

Dit type contract is perfect als je vooral rust wilt en niet wilt nadenken over je energiekosten of veranderende prijzen.$md$
WHERE slug = 'vast3';

UPDATE public.contract_types SET description = $md$Bij een dynamisch contract:

• Veranderen de stroomprijzen elk uur en de gasprijzen elke dag
• Kun je flink besparen door slim te plannen
• Betaal je soms heel weinig (of krijg je zelfs geld)
• Kun je elke maand wisselen naar een ander soort contract

Dit type contract is ideaal als je thuis bent op flexibele tijden en bereid bent je energieverbruik aan te passen aan de goedkope momenten.$md$
WHERE slug = 'dynamisch';

UPDATE public.contract_types SET description = $md$Bij een Time of Use contract gelden verschillende tarieven op verschillende momenten van de dag (bijvoorbeeld dal, normaal en piek).

• Je weet vooraf welke tarieven in welk tijdvak gelden
• Je kunt besparen door verbruik naar daluren te verschuiven
• Anders dan bij dynamische tarieven veranderen de tarieven niet per uur
• Geschikt als je een voorspelbaar, maar wel tijdsafhankelijk patroon wilt

Dit type contract past bij mensen die hun verbruik (deels) kunnen plannen en willen profiteren van goedkopere tijdvakken, zonder het uurlijkse karakter van een dynamisch contract.$md$
WHERE slug = 'timeofuse';

COMMIT;
