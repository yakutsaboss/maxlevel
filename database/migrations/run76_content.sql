-- Run 76: Knowledge Feed — content articles, quizzes, progress, bookmarks
-- Creates the Content Platform schema and seeds 30 articles with 80+ quiz questions.

----------------------------------------------------------------------
-- 1. TABLES
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    body_html TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    read_time_min INTEGER NOT NULL DEFAULT 5,
    xp_reward INTEGER NOT NULL DEFAULT 25,
    cover_emoji VARCHAR(10),
    difficulty VARCHAR(20) DEFAULT 'beginner',
    tags JSONB DEFAULT '[]',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_quiz (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES content_articles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_content_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES content_articles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    quiz_score INTEGER,
    xp_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, article_id)
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES content_articles(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

----------------------------------------------------------------------
-- 2. INDEXES
----------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_content_articles_category_published
    ON content_articles(category, is_published);
CREATE INDEX IF NOT EXISTS idx_content_articles_created
    ON content_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_content_progress_user
    ON user_content_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user
    ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_content_quiz_article
    ON content_quiz(article_id);

----------------------------------------------------------------------
-- 3. SEED: Personal Finance Articles (IDs 1-10)
----------------------------------------------------------------------

INSERT INTO content_articles (title, summary, body_html, category, read_time_min, xp_reward, cover_emoji, difficulty, tags, is_published)
VALUES

-- Article 1: Budgeting Basics
(
  'Budgeting Basics: Your First Step to Financial Freedom',
  'Learn how to create a simple budget that actually works. We break down the essentials of tracking income, categorising expenses, and finding money you didn''t know you had.',
  '<h2>Why Budget?</h2>
<p>A budget is the foundation of every successful financial plan. Without knowing where your money goes, you can''t direct it where you <em>want</em> it to go. Studies show that people who budget consistently save 20% more than those who don''t.</p>

<h2>Step 1 — Track Your Income</h2>
<p>Write down every source of income you receive each month: salary, freelance gigs, side hustles, even cashback rewards. Use net (after-tax) numbers so you see what''s actually available.</p>

<h2>Step 2 — List Fixed &amp; Variable Expenses</h2>
<ul>
  <li><strong>Fixed:</strong> Rent, insurance, loan payments — these rarely change.</li>
  <li><strong>Variable:</strong> Groceries, entertainment, dining out — these are where adjustments happen.</li>
</ul>

<h2>Step 3 — Set Spending Limits</h2>
<p>Allocate a specific amount to each variable category. Start generous and tighten over time. The goal is awareness first, optimisation second.</p>

<h2>Step 4 — Review Weekly</h2>
<p>Set a 15-minute weekly check-in. Compare actual spending to your plan. Adjust categories as needed — a budget is a living document, not a rigid contract.</p>

<p><strong>Key takeaway:</strong> The best budget is the one you actually follow. Start simple, stay consistent, and refine as you learn your patterns.</p>',
  'finance', 5, 25, '💰', 'beginner',
  '["budgeting", "saving", "money management", "basics"]', true
),

-- Article 2: Emergency Fund
(
  'Build Your Emergency Fund in 6 Months',
  'An emergency fund protects you from life''s surprises. Here''s a proven plan to save 3-6 months of expenses without feeling deprived.',
  '<h2>What Is an Emergency Fund?</h2>
<p>An emergency fund is a dedicated cash reserve for unexpected events — job loss, medical bills, car repairs. It''s not an investment; it''s insurance you pay yourself.</p>

<h2>How Much Do You Need?</h2>
<p>The standard recommendation is 3-6 months of essential expenses. If your monthly essentials total $2,000, aim for $6,000-$12,000. Start with a mini goal of $1,000 to build momentum.</p>

<h2>The 6-Month Plan</h2>
<ul>
  <li><strong>Month 1-2:</strong> Audit subscriptions and cancel unused ones. Redirect those payments to savings.</li>
  <li><strong>Month 3-4:</strong> Sell items you no longer use. Even $200-$500 from decluttering adds up fast.</li>
  <li><strong>Month 5-6:</strong> Automate a fixed transfer on payday. Treat it like a bill you can''t skip.</li>
</ul>

<h2>Where to Keep It</h2>
<p>Use a high-yield savings account (HYSA) — separate from your daily checking. The slight friction of transferring money prevents impulse spending while still earning interest.</p>

<p><strong>Key takeaway:</strong> Start today, even with $50. Consistency beats amount every time.</p>',
  'finance', 5, 25, '🛡️', 'beginner',
  '["emergency fund", "saving", "financial safety", "basics"]', true
),

-- Article 3: Debt Payoff Strategies
(
  'Crush Your Debt: Snowball vs. Avalanche Methods',
  'Discover the two most effective debt payoff strategies and choose the one that fits your psychology. Both work — the best one is the one you''ll stick with.',
  '<h2>The Debt Problem</h2>
<p>The average person carries thousands in consumer debt. Interest compounds daily, turning small balances into long-term burdens. A structured payoff plan can save you years and thousands of dollars.</p>

<h2>Method 1: Debt Snowball</h2>
<p>Pay minimums on everything, then throw all extra money at the <strong>smallest balance</strong>. When it''s gone, roll that payment into the next smallest. You get quick wins that fuel motivation.</p>

<h2>Method 2: Debt Avalanche</h2>
<p>Pay minimums on everything, then attack the debt with the <strong>highest interest rate</strong>. Mathematically optimal — you pay less interest overall. But it requires patience if the highest-rate debt is also the largest.</p>

<h2>Which Should You Choose?</h2>
<ul>
  <li>If you need <strong>motivation and quick wins</strong> → Snowball</li>
  <li>If you want to <strong>minimise total interest paid</strong> → Avalanche</li>
  <li>If your rates are similar → Snowball (the psychological boost matters more)</li>
</ul>

<h2>Pro Tips</h2>
<p>Negotiate lower interest rates by calling your card issuer. Consider balance-transfer cards for high-rate debt. Never take on new debt while paying off old debt — that''s running on a treadmill.</p>

<p><strong>Key takeaway:</strong> Pick one method, commit to it, and celebrate every payoff milestone.</p>',
  'finance', 6, 30, '🏔️', 'beginner',
  '["debt", "payoff", "snowball", "avalanche", "credit cards"]', true
),

-- Article 4: Compound Interest
(
  'The Magic of Compound Interest: Time Is Your Superpower',
  'Albert Einstein reportedly called it the eighth wonder of the world. Here''s how compound interest works and why starting early changes everything.',
  '<h2>Simple vs. Compound Interest</h2>
<p><strong>Simple interest</strong> is calculated on the principal only. <strong>Compound interest</strong> is calculated on the principal <em>plus</em> accumulated interest. That difference is where wealth is built.</p>

<h2>A Real Example</h2>
<p>Invest $5,000 at 8% annual return:</p>
<ul>
  <li><strong>After 10 years:</strong> $10,795</li>
  <li><strong>After 20 years:</strong> $23,305</li>
  <li><strong>After 30 years:</strong> $50,313</li>
</ul>
<p>Notice the acceleration — the last 10 years added more than the first 20 combined. That''s compounding at work.</p>

<h2>The Rule of 72</h2>
<p>Divide 72 by your annual return rate to estimate how many years it takes to double your money. At 8%, your money doubles roughly every 9 years.</p>

<h2>Why Starting Early Wins</h2>
<p>A 25-year-old investing $200/month at 8% will have $702,000 at age 65. A 35-year-old doing the same will have $298,000. Starting 10 years earlier more than doubled the result — with the exact same monthly contribution.</p>

<p><strong>Key takeaway:</strong> The best time to start investing was yesterday. The second best time is today.</p>',
  'finance', 5, 30, '📈', 'beginner',
  '["compound interest", "investing", "wealth building", "time value"]', true
),

-- Article 5: Investing for Beginners
(
  'Investing 101: Index Funds and Why They Win',
  'You don''t need to pick stocks to build wealth. Index funds offer instant diversification, low fees, and historically beat most professional fund managers.',
  '<h2>What Is an Index Fund?</h2>
<p>An index fund is a type of investment that tracks a market index — like the S&amp;P 500, which holds the 500 largest US companies. Instead of betting on one stock, you own a tiny piece of hundreds of companies.</p>

<h2>Why Index Funds?</h2>
<ul>
  <li><strong>Diversification:</strong> One fund spreads your risk across many companies.</li>
  <li><strong>Low fees:</strong> Expense ratios as low as 0.03% vs. 1-2% for active funds.</li>
  <li><strong>Performance:</strong> Over 15 years, ~90% of active fund managers underperform the index.</li>
</ul>

<h2>How to Start</h2>
<p>Open a brokerage account (many are free). Choose a broad market index fund. Set up automatic monthly contributions — even $50/month is a great start. Don''t try to time the market; <strong>time in the market</strong> beats timing the market.</p>

<h2>Common Mistakes</h2>
<ul>
  <li>Checking your portfolio daily — it causes panic selling.</li>
  <li>Selling during downturns — markets always recover historically.</li>
  <li>Paying high fees — even 1% extra in fees costs hundreds of thousands over a career.</li>
</ul>

<p><strong>Key takeaway:</strong> Keep it simple, keep it consistent, and let compounding do the heavy lifting.</p>',
  'finance', 6, 35, '📊', 'intermediate',
  '["investing", "index funds", "stock market", "passive investing"]', true
),

-- Article 6: The 50/30/20 Rule
(
  'The 50/30/20 Rule: The Simplest Budget Framework',
  'If traditional budgeting feels overwhelming, the 50/30/20 rule gives you a simple framework. Allocate your after-tax income into three buckets and never stress about categories again.',
  '<h2>The Three Buckets</h2>
<ul>
  <li><strong>50% Needs:</strong> Housing, utilities, groceries, insurance, minimum debt payments — things you must pay.</li>
  <li><strong>30% Wants:</strong> Dining out, entertainment, hobbies, subscriptions — things you enjoy but could live without.</li>
  <li><strong>20% Savings &amp; Debt:</strong> Emergency fund, investments, extra debt payments — building your future.</li>
</ul>

<h2>Putting It Into Practice</h2>
<p>If your take-home pay is $4,000/month: spend up to $2,000 on needs, $1,200 on wants, and save at least $800. Simple to remember, easy to track.</p>

<h2>When to Adjust</h2>
<p>If you live in a high-cost city, your needs might be 60%. That''s okay — reduce wants to 20% and keep savings at 20%. The ratios are guidelines, not laws. The key insight is to always protect the savings percentage.</p>

<h2>Why It Works</h2>
<p>Most budgets fail because they have too many categories. The 50/30/20 rule reduces decision fatigue. You make three decisions instead of thirty. And because "wants" has its own bucket, you never feel guilty about enjoying your money.</p>

<p><strong>Key takeaway:</strong> Guard the 20% savings bucket fiercely. Everything else is flexible.</p>',
  'finance', 4, 25, '🥧', 'beginner',
  '["budgeting", "50/30/20", "framework", "simple budget"]', true
),

-- Article 7: Credit Score Tips
(
  'Boost Your Credit Score: 7 Habits That Actually Work',
  'Your credit score affects loan rates, apartment approvals, and even job offers. Here are seven proven habits to build and maintain an excellent score.',
  '<h2>What Affects Your Score</h2>
<p>The five major factors: payment history (35%), credit utilisation (30%), length of history (15%), credit mix (10%), and new inquiries (10%). Focus on the big two — payments and utilisation — for the fastest impact.</p>

<h2>The 7 Habits</h2>
<ul>
  <li><strong>1. Pay on time, every time.</strong> Set up autopay for at least the minimum. One missed payment can drop your score 100+ points.</li>
  <li><strong>2. Keep utilisation under 30%.</strong> If your limit is $10,000, keep balances below $3,000. Under 10% is even better.</li>
  <li><strong>3. Don''t close old cards.</strong> Length of history matters. Keep your oldest card open even if you rarely use it.</li>
  <li><strong>4. Limit hard inquiries.</strong> Each application triggers an inquiry. Space them out by 6+ months.</li>
  <li><strong>5. Diversify credit types.</strong> A mix of cards, instalment loans, and maybe a small personal loan shows you can manage different types.</li>
  <li><strong>6. Dispute errors.</strong> Check your report annually at AnnualCreditReport.com. Errors are more common than you think.</li>
  <li><strong>7. Be patient.</strong> Score improvements take 3-6 months. Consistency is key.</li>
</ul>

<p><strong>Key takeaway:</strong> Pay on time and keep utilisation low — those two habits alone handle 65% of your score.</p>',
  'finance', 5, 30, '⭐', 'beginner',
  '["credit score", "credit cards", "financial health", "habits"]', true
),

-- Article 8: Side Income Ideas
(
  '10 Realistic Side Income Ideas You Can Start This Week',
  'Building extra income doesn''t require a huge investment. Here are ten practical ideas sorted by skill level and startup cost.',
  '<h2>Low Barrier (Start Today)</h2>
<ul>
  <li><strong>Freelance writing/editing:</strong> Platforms like Upwork and Fiverr connect you with clients immediately. Start at $15-25/hour and raise rates as you build reviews.</li>
  <li><strong>Tutoring:</strong> Subjects you know well — maths, languages, test prep. Online platforms removed geography limits.</li>
  <li><strong>Selling unused items:</strong> Declutter and profit. Marketplace apps make listing items take minutes.</li>
</ul>

<h2>Medium Effort (1-4 Weeks Setup)</h2>
<ul>
  <li><strong>Virtual assistant:</strong> Admin tasks for small businesses. Scheduling, email management, data entry. $15-30/hour.</li>
  <li><strong>Pet sitting/dog walking:</strong> Apps like Rover connect you with local pet owners. Great if you love animals.</li>
  <li><strong>Delivery driving:</strong> Flexible hours, decent base pay plus tips. Best in urban areas during meal times.</li>
</ul>

<h2>Higher Skill (1-3 Months to Build)</h2>
<ul>
  <li><strong>Web development:</strong> Build simple sites for local businesses. $500-$2,000 per project is achievable for beginners.</li>
  <li><strong>Content creation:</strong> YouTube, blog, podcast. Revenue takes time but scales without your direct hours.</li>
  <li><strong>Online courses:</strong> Package expertise into a course. Platforms handle hosting and payments.</li>
  <li><strong>Consulting:</strong> If you have professional expertise, charge for advice. Even 5 hours/month at $100/hour is meaningful.</li>
</ul>

<p><strong>Key takeaway:</strong> Start with one idea, do it consistently for 3 months, then evaluate before adding another.</p>',
  'finance', 6, 30, '💡', 'intermediate',
  '["side income", "freelancing", "extra money", "hustle"]', true
),

-- Article 9: Tax Saving Basics
(
  'Tax Saving Basics: Keep More of What You Earn',
  'Understanding basic tax strategies can save you thousands yearly. Learn about deductions, credits, and tax-advantaged accounts.',
  '<h2>Deductions vs. Credits</h2>
<p><strong>Deductions</strong> reduce your taxable income. If you''re in the 22% bracket, a $1,000 deduction saves you $220. <strong>Credits</strong> reduce your tax bill directly — a $1,000 credit saves you exactly $1,000. Credits are more powerful.</p>

<h2>Tax-Advantaged Accounts</h2>
<ul>
  <li><strong>401(k)/403(b):</strong> Contribute pre-tax money. Employer match is free money — always take the full match first.</li>
  <li><strong>IRA (Traditional):</strong> Contributions may be tax-deductible. Growth is tax-deferred.</li>
  <li><strong>Roth IRA:</strong> Contribute after-tax money but withdrawals in retirement are completely tax-free. Great if you expect to be in a higher bracket later.</li>
  <li><strong>HSA:</strong> Triple tax advantage — deductible contribution, tax-free growth, tax-free withdrawal for medical expenses. The best tax-advantaged account available.</li>
</ul>

<h2>Common Deductions People Miss</h2>
<ul>
  <li>Student loan interest (up to $2,500)</li>
  <li>Home office deduction (if self-employed)</li>
  <li>Charitable contributions</li>
  <li>State and local taxes (SALT, up to $10,000)</li>
</ul>

<p><strong>Key takeaway:</strong> Max your employer 401(k) match first, then fund a Roth IRA. These two steps alone can save you tens of thousands over your career.</p>',
  'finance', 6, 35, '🧾', 'intermediate',
  '["taxes", "deductions", "credits", "retirement accounts"]', true
),

-- Article 10: Retirement Planning
(
  'Retirement Planning: Start Now, Retire Comfortably',
  'It''s never too early — or too late — to plan for retirement. Here''s a framework for every age, from your twenties to your fifties.',
  '<h2>The Core Question</h2>
<p>How much do you need? A common guideline: 25x your annual expenses. If you spend $40,000/year, target $1,000,000. This supports the "4% rule" — withdrawing 4% annually with low risk of running out.</p>

<h2>By Age</h2>
<ul>
  <li><strong>20s:</strong> Start with any amount. Time is your biggest asset. Aim to save 15% of income. Invest aggressively — you have decades to recover from downturns.</li>
  <li><strong>30s:</strong> You should have ~1x your salary saved. Increase contributions with every raise. Start thinking about target retirement age.</li>
  <li><strong>40s:</strong> Target ~3x salary saved. Diversify investments. Consider catch-up contributions if behind. This is the decade to get serious.</li>
  <li><strong>50s:</strong> Target ~6x salary saved. Take advantage of catch-up contribution limits ($7,500 extra in 401(k)). Start modelling retirement scenarios.</li>
</ul>

<h2>The Power of Saving Rate</h2>
<p>Your savings rate matters more than your investment returns. Someone saving 30% of their income at 6% returns will retire earlier than someone saving 10% at 10% returns. Control what you can control.</p>

<p><strong>Key takeaway:</strong> The maths is simple — save more, invest consistently, and let time do the heavy lifting. Start today regardless of your age.</p>',
  'finance', 7, 40, '🏖️', 'intermediate',
  '["retirement", "planning", "401k", "financial independence"]', true
)

ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 4. SEED: Health Articles (IDs 11-20)
----------------------------------------------------------------------

INSERT INTO content_articles (title, summary, body_html, category, read_time_min, xp_reward, cover_emoji, difficulty, tags, is_published)
VALUES

-- Article 11: Morning Routines
(
  'Design a Morning Routine That Energises Your Whole Day',
  'How you start your morning sets the tone for everything that follows. Build a simple, sustainable morning routine that boosts energy and focus.',
  '<h2>Why Mornings Matter</h2>
<p>Research shows that willpower is highest in the morning. By front-loading important habits, you ensure they happen before the chaos of the day takes over. A consistent wake-up time also regulates your circadian rhythm.</p>

<h2>The 3-Block Morning</h2>
<ul>
  <li><strong>Block 1 — Body (15 min):</strong> Hydrate (glass of water), stretch or light movement, splash cold water on your face. No phone yet.</li>
  <li><strong>Block 2 — Mind (15 min):</strong> Journal, meditate, or read something meaningful. This is your mental warm-up.</li>
  <li><strong>Block 3 — Fuel (15 min):</strong> A balanced breakfast with protein, healthy fats, and complex carbs. Avoid sugar spikes.</li>
</ul>

<h2>Common Mistakes</h2>
<ul>
  <li><strong>Too ambitious:</strong> A 2-hour routine is unsustainable. Start with 30-45 minutes.</li>
  <li><strong>Checking phone first:</strong> Notifications hijack your attention. Wait at least 30 minutes after waking.</li>
  <li><strong>Inconsistent timing:</strong> Waking at different times confuses your body. Pick a time and stick to it — even on weekends (within 1 hour).</li>
</ul>

<p><strong>Key takeaway:</strong> A morning routine isn''t about doing more — it''s about starting intentionally instead of reactively.</p>',
  'health', 5, 25, '🌅', 'beginner',
  '["morning routine", "habits", "energy", "productivity"]', true
),

-- Article 12: Hydration Benefits
(
  'The Science of Staying Hydrated: More Than Just Drinking Water',
  'Dehydration affects your energy, focus, and even mood long before you feel thirsty. Learn how much you actually need and smart ways to hit your daily target.',
  '<h2>What Dehydration Does</h2>
<p>Even mild dehydration (1-2% body weight loss) reduces cognitive performance by up to 25%. Symptoms include fatigue, headaches, poor concentration, and irritability — often mistaken for hunger or tiredness.</p>

<h2>How Much Do You Need?</h2>
<p>The "8 glasses" rule is a rough guideline. A better formula: <strong>30-35 ml per kg of body weight</strong>. An 70kg person needs about 2.1-2.5 litres. Increase by 500ml-1L on days you exercise heavily.</p>

<h2>Hydration Hacks</h2>
<ul>
  <li><strong>Front-load:</strong> Drink 500ml within 30 minutes of waking. You lose water overnight through breathing.</li>
  <li><strong>Anchor to habits:</strong> One glass before each meal. That''s 3 glasses without thinking.</li>
  <li><strong>Eat your water:</strong> Cucumbers (96% water), watermelon (92%), oranges (87%) all count.</li>
  <li><strong>Flavour it:</strong> Lemon, cucumber slices, or mint make plain water more appealing.</li>
</ul>

<h2>Signs You''re Well-Hydrated</h2>
<p>Pale yellow urine is the simplest indicator. Dark yellow means drink more. Clear means you might be overdoing it (rare but possible — can dilute electrolytes).</p>

<p><strong>Key takeaway:</strong> Don''t wait until you''re thirsty. By then, you''re already mildly dehydrated.</p>',
  'health', 5, 25, '💧', 'beginner',
  '["hydration", "water", "health basics", "energy"]', true
),

-- Article 13: Sleep Hygiene
(
  'Sleep Hygiene: 8 Rules for Better Rest Tonight',
  'Quality sleep is the single most impactful health habit. These evidence-based rules help you fall asleep faster, stay asleep longer, and wake up refreshed.',
  '<h2>Why Sleep Quality Matters</h2>
<p>Poor sleep increases cortisol, weakens immunity, impairs memory consolidation, and raises the risk of chronic diseases. Yet most adults get less than 7 hours. The goal isn''t just more sleep — it''s <em>better</em> sleep.</p>

<h2>The 8 Rules</h2>
<ul>
  <li><strong>1. Consistent schedule:</strong> Same bedtime and wake time daily — including weekends. Your body craves regularity.</li>
  <li><strong>2. Cool room:</strong> 18-20°C (65-68°F) is optimal. Your core temperature needs to drop for sleep onset.</li>
  <li><strong>3. Dark environment:</strong> Blackout curtains or a sleep mask. Even small amounts of light disrupt melatonin production.</li>
  <li><strong>4. No screens 1 hour before bed:</strong> Blue light suppresses melatonin. If you must use devices, enable night mode.</li>
  <li><strong>5. Caffeine cutoff:</strong> No caffeine after 2 PM. Its half-life is 5-6 hours — that afternoon coffee is still 25% active at midnight.</li>
  <li><strong>6. Wind-down ritual:</strong> 20-30 minutes of calming activity — reading, stretching, journaling. Signal to your brain that sleep is coming.</li>
  <li><strong>7. Reserve the bed for sleep:</strong> Don''t work, eat, or scroll in bed. Train your brain to associate the bed with rest.</li>
  <li><strong>8. Limit alcohol:</strong> It helps you fall asleep but fragments sleep cycles. You wake up less rested despite sleeping longer.</li>
</ul>

<p><strong>Key takeaway:</strong> Pick 2-3 rules to implement this week. Small changes compound into dramatically better sleep over time.</p>',
  'health', 6, 30, '😴', 'beginner',
  '["sleep", "sleep hygiene", "rest", "recovery", "habits"]', true
),

-- Article 14: Meal Prep Basics
(
  'Meal Prep 101: Eat Healthier Without the Daily Hassle',
  'Meal prepping saves time, money, and willpower. This beginner-friendly guide shows you how to prep a full week of meals in under 2 hours.',
  '<h2>Why Meal Prep Works</h2>
<p>Decision fatigue is real. By the end of the day, choosing healthy food feels harder. Meal prep removes the decision — your healthy meal is already ready. People who meal prep eat 30% more vegetables on average.</p>

<h2>The Simple Framework</h2>
<ul>
  <li><strong>Pick 2 proteins:</strong> Chicken + beans, tofu + fish, eggs + lentils. Cook in bulk.</li>
  <li><strong>Pick 2 grains:</strong> Rice + quinoa, pasta + sweet potatoes. These store well for 5 days.</li>
  <li><strong>Pick 3-4 vegetables:</strong> Roast a tray of mixed veggies. They reheat perfectly.</li>
  <li><strong>Add variety with sauces:</strong> Same base ingredients with different sauces = different meals every day.</li>
</ul>

<h2>Beginner Schedule</h2>
<p><strong>Sunday 2-hour prep:</strong></p>
<ul>
  <li>30 min: Cook grains (rice cooker / stovetop)</li>
  <li>40 min: Bake proteins (oven at 200°C)</li>
  <li>30 min: Roast vegetables (same oven, different tray)</li>
  <li>20 min: Portion into containers, add sauces, refrigerate</li>
</ul>

<h2>Storage Tips</h2>
<p>Glass containers keep food fresh longer. Label with the day. Most prepped meals last 4-5 days refrigerated. Freeze anything beyond day 5.</p>

<p><strong>Key takeaway:</strong> Start with lunches only. Once that feels easy, add dinners. Build the habit before optimising the menu.</p>',
  'health', 5, 25, '🍱', 'beginner',
  '["meal prep", "nutrition", "cooking", "healthy eating"]', true
),

-- Article 15: Stretching Guide
(
  'Daily Stretching: 10 Minutes to Reduce Pain and Improve Mobility',
  'Sitting all day creates tight hips, sore shoulders, and stiff necks. This 10-minute daily stretching routine targets the areas that desk workers need most.',
  '<h2>Why Stretching Matters</h2>
<p>Prolonged sitting shortens hip flexors, tightens chest muscles, and weakens glutes. Stretching reverses this by maintaining muscle length, improving blood flow, and reducing injury risk. It also reduces stress hormones.</p>

<h2>The 10-Minute Desk Worker Routine</h2>
<ul>
  <li><strong>Neck rolls (1 min):</strong> Slowly circle your head — 5 times each direction. Release tension from screen time.</li>
  <li><strong>Chest opener (1 min):</strong> Clasp hands behind your back, squeeze shoulder blades together, lift arms slightly. Hold 30 seconds x2.</li>
  <li><strong>Cat-cow (2 min):</strong> On all fours, alternate between arching and rounding your spine. 10 slow repetitions.</li>
  <li><strong>Hip flexor stretch (2 min):</strong> Lunge position, back knee on the ground, push hips forward gently. 1 minute per side.</li>
  <li><strong>Hamstring stretch (2 min):</strong> Sit on the floor, one leg extended, reach for your toes. 1 minute per side.</li>
  <li><strong>Figure-4 stretch (2 min):</strong> Lie on your back, cross one ankle over opposite knee, pull the bottom leg toward you. Targets deep glutes. 1 minute per side.</li>
</ul>

<h2>When to Stretch</h2>
<p>Morning stretching wakes up your body. Midday stretching combats the afternoon slump. Evening stretching aids recovery and sleep. Pick the time that you''ll actually do consistently.</p>

<p><strong>Key takeaway:</strong> 10 minutes of daily stretching prevents hours of pain and stiffness. Your future self will thank you.</p>',
  'health', 4, 25, '🧘', 'beginner',
  '["stretching", "flexibility", "desk worker", "mobility", "pain relief"]', true
),

-- Article 16: Mental Health Check-In
(
  'Mental Health Check-In: A Weekly Practice for Emotional Wellness',
  'We track our steps, calories, and screen time — but rarely our emotional state. A structured weekly check-in helps you catch problems early and build resilience.',
  '<h2>Why Check In?</h2>
<p>Mental health issues often build gradually. By the time you notice, you''re deep in burnout or anxiety. A weekly check-in is like a dashboard for your emotions — catching warning signs before they become crises.</p>

<h2>The 5-Question Check-In</h2>
<p>Set a weekly reminder (Sunday evening works well). Answer honestly, score each 1-5:</p>
<ul>
  <li><strong>1. Energy:</strong> How is my overall energy this week? (1=exhausted, 5=vibrant)</li>
  <li><strong>2. Mood:</strong> What has my predominant mood been? (1=low/anxious, 5=positive/calm)</li>
  <li><strong>3. Connection:</strong> Have I had meaningful social interactions? (1=isolated, 5=well-connected)</li>
  <li><strong>4. Purpose:</strong> Did my week feel meaningful? (1=aimless, 5=purposeful)</li>
  <li><strong>5. Self-care:</strong> Did I take care of my body? (sleep, food, exercise) (1=neglected, 5=well-cared-for)</li>
</ul>

<h2>What to Do With Your Score</h2>
<ul>
  <li><strong>20-25:</strong> Great week. Note what went well — replicate it.</li>
  <li><strong>15-19:</strong> Decent but room for improvement. Identify the lowest score and address it next week.</li>
  <li><strong>10-14:</strong> Warning zone. Prioritise rest, reach out to someone, and simplify your schedule.</li>
  <li><strong>Below 10:</strong> Seek support. Talk to a friend, family member, or professional.</li>
</ul>

<p><strong>Key takeaway:</strong> What gets measured gets managed. A 5-minute weekly check-in can prevent months of struggling.</p>',
  'health', 5, 30, '🧠', 'beginner',
  '["mental health", "self-care", "wellness", "check-in", "emotional health"]', true
),

-- Article 17: Sugar Reduction
(
  'Cut Sugar Without Feeling Deprived: A Practical Guide',
  'The average person consumes 3x the recommended daily sugar. Learn to reduce sugar intake gradually while still enjoying food you love.',
  '<h2>The Sugar Problem</h2>
<p>Excess sugar contributes to weight gain, energy crashes, inflammation, and increased risk of diabetes and heart disease. The WHO recommends under 25g (6 teaspoons) of added sugar daily. Most people consume 70-80g.</p>

<h2>The Gradual Approach</h2>
<p>Going cold turkey rarely works. Instead, use a 4-week taper:</p>
<ul>
  <li><strong>Week 1:</strong> Eliminate sugary drinks (soda, juice, sweetened coffee). Switch to water, unsweetened tea, or black coffee. This alone cuts 30-40g for most people.</li>
  <li><strong>Week 2:</strong> Replace sugary snacks with fruit. The natural sugar comes with fibre, which slows absorption and prevents crashes.</li>
  <li><strong>Week 3:</strong> Read labels on "healthy" foods — yogurt, granola bars, sauces. Many have 15-20g of hidden sugar per serving.</li>
  <li><strong>Week 4:</strong> Reduce sugar in cooking and baking by 25-50%. Your palate adjusts faster than you think.</li>
</ul>

<h2>Smart Swaps</h2>
<ul>
  <li>Soda → sparkling water with lemon</li>
  <li>Candy → dark chocolate (70%+)</li>
  <li>Sweetened yogurt → plain Greek yogurt with berries</li>
  <li>Juice → whole fruit</li>
</ul>

<p><strong>Key takeaway:</strong> After 2-3 weeks of reduced sugar, sweet foods taste <em>sweeter</em>. Your taste buds recalibrate — what once seemed normal will taste overwhelmingly sweet.</p>',
  'health', 5, 25, '🍬', 'beginner',
  '["sugar", "nutrition", "diet", "healthy eating", "habits"]', true
),

-- Article 18: Protein Intake
(
  'Protein Power: How Much You Need and the Best Sources',
  'Protein builds muscle, supports recovery, and keeps you feeling full longer. But how much do you really need, and where should it come from?',
  '<h2>How Much Protein?</h2>
<p>The general recommendation is <strong>1.6-2.2g per kg of body weight</strong> for active individuals. A 75kg person should aim for 120-165g daily. Sedentary people need less (0.8g/kg), but most benefit from higher intake.</p>

<h2>Why It Matters</h2>
<ul>
  <li><strong>Muscle repair:</strong> Exercise creates micro-tears. Protein provides amino acids to rebuild stronger.</li>
  <li><strong>Satiety:</strong> Protein is the most filling macronutrient. High-protein meals reduce snacking.</li>
  <li><strong>Metabolism:</strong> The thermic effect of protein is 20-30% — your body burns calories digesting it.</li>
  <li><strong>Preservation:</strong> During weight loss, adequate protein prevents muscle loss.</li>
</ul>

<h2>Best Sources (per 100g)</h2>
<ul>
  <li><strong>Chicken breast:</strong> 31g protein, lean and versatile</li>
  <li><strong>Greek yogurt:</strong> 10g protein, great as a snack</li>
  <li><strong>Eggs:</strong> 13g protein, complete amino acid profile</li>
  <li><strong>Lentils:</strong> 9g protein, excellent plant-based option with fibre</li>
  <li><strong>Tuna:</strong> 26g protein, convenient and affordable</li>
  <li><strong>Tofu:</strong> 8g protein, absorbs any flavour</li>
</ul>

<h2>Timing</h2>
<p>Spread protein across meals (30-40g per meal) rather than loading it all into dinner. This maximises muscle protein synthesis throughout the day.</p>

<p><strong>Key takeaway:</strong> Aim for a palm-sized portion of protein at every meal. Most people undereat protein at breakfast — fix that first.</p>',
  'health', 5, 30, '🥩', 'intermediate',
  '["protein", "nutrition", "muscle", "diet", "macros"]', true
),

-- Article 19: HIIT Benefits
(
  'HIIT Training: Maximum Results in Minimum Time',
  'High-Intensity Interval Training delivers the fitness benefits of an hour-long workout in just 20 minutes. Here''s the science behind it and how to start safely.',
  '<h2>What Is HIIT?</h2>
<p>HIIT alternates between short bursts of maximum effort (80-95% of max heart rate) and recovery periods. A typical session: 30 seconds all-out, 30 seconds rest, repeated for 15-20 minutes.</p>

<h2>Proven Benefits</h2>
<ul>
  <li><strong>EPOC effect:</strong> Your body continues burning calories for 24-48 hours after a HIIT session (the "afterburn" effect).</li>
  <li><strong>Cardiovascular health:</strong> HIIT improves VO2 max more effectively than steady-state cardio.</li>
  <li><strong>Time efficiency:</strong> 20 minutes of HIIT equals ~45 minutes of moderate cardio for calorie burn.</li>
  <li><strong>Insulin sensitivity:</strong> HIIT significantly improves how your body processes blood sugar.</li>
  <li><strong>No equipment needed:</strong> Bodyweight exercises like burpees, jump squats, and mountain climbers work perfectly.</li>
</ul>

<h2>Beginner HIIT Workout (16 min)</h2>
<p>4 rounds, 30 seconds work / 30 seconds rest per exercise:</p>
<ul>
  <li>Jumping jacks</li>
  <li>Bodyweight squats</li>
  <li>Push-ups (knees if needed)</li>
  <li>High knees</li>
</ul>

<h2>Safety Notes</h2>
<p>Start with 2 sessions per week. Don''t do HIIT on consecutive days — recovery is when your body adapts. If you''re new to exercise, build a base of 4-6 weeks of moderate activity first.</p>

<p><strong>Key takeaway:</strong> HIIT is not about destroying yourself. It''s about smart intensity — push hard in bursts, recover fully, repeat.</p>',
  'health', 5, 35, '🏃', 'intermediate',
  '["HIIT", "exercise", "fitness", "cardio", "workout"]', true
),

-- Article 20: Meditation Introduction
(
  'Meditation for Beginners: Calm Your Mind in 5 Minutes',
  'Meditation isn''t about emptying your mind — it''s about noticing thoughts without getting caught up in them. Start with just 5 minutes and experience real benefits.',
  '<h2>What Meditation Actually Is</h2>
<p>Meditation is focused attention practice. Like training a muscle, you''re training your brain to focus and return from distractions. Thoughts will arise — that''s normal. The practice is in noticing them and gently returning to your anchor (usually breath).</p>

<h2>The 5-Minute Practice</h2>
<ul>
  <li><strong>Sit comfortably:</strong> Chair or floor, spine straight but not rigid. Hands on knees or lap.</li>
  <li><strong>Close your eyes:</strong> Or soften your gaze on a spot in front of you.</li>
  <li><strong>Focus on breath:</strong> Notice the sensation of air entering and leaving your nostrils. Don''t control it — just observe.</li>
  <li><strong>When your mind wanders:</strong> (It will, 100% of the time.) Notice the thought, label it ("thinking"), and return to breath. This return IS the exercise.</li>
  <li><strong>Start with 5 minutes:</strong> Use a timer so you''re not watching the clock. Increase by 1 minute per week.</li>
</ul>

<h2>Science-Backed Benefits</h2>
<ul>
  <li>Reduces cortisol (stress hormone) by up to 25%</li>
  <li>Increases grey matter in brain regions responsible for self-awareness and compassion</li>
  <li>Improves focus and working memory within 4 weeks of daily practice</li>
  <li>Reduces anxiety symptoms comparable to some medications (studies show)</li>
</ul>

<p><strong>Key takeaway:</strong> You can''t fail at meditation. Every time you notice your mind wandering and return to breath, that''s a rep. The wandering IS the workout.</p>',
  'health', 4, 25, '🧘‍♂️', 'beginner',
  '["meditation", "mindfulness", "stress relief", "mental health", "beginners"]', true
)

ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 5. SEED: Productivity Articles (IDs 21-30)
----------------------------------------------------------------------

INSERT INTO content_articles (title, summary, body_html, category, read_time_min, xp_reward, cover_emoji, difficulty, tags, is_published)
VALUES

-- Article 21: Time Blocking
(
  'Time Blocking: Schedule Your Day Like a CEO',
  'Time blocking assigns every hour a specific task. It eliminates multitasking, protects deep work, and makes you 40% more productive according to research.',
  '<h2>What Is Time Blocking?</h2>
<p>Instead of a to-do list (which grows infinitely), time blocking assigns specific tasks to specific hours. If it''s not on the calendar, it doesn''t happen. Every minute has a job.</p>

<h2>How to Time Block</h2>
<ul>
  <li><strong>1. List tomorrow''s tasks:</strong> Everything you need to do, including routines.</li>
  <li><strong>2. Estimate durations:</strong> Add 25% buffer — humans consistently underestimate time.</li>
  <li><strong>3. Assign to time slots:</strong> Put creative/hard work in your peak hours (usually morning). Meetings and admin in low-energy periods.</li>
  <li><strong>4. Include breaks:</strong> Block 15-minute breaks between deep work sessions. Your brain needs recovery.</li>
  <li><strong>5. Protect your blocks:</strong> Treat them like meetings with yourself. Say no to interruptions during focused blocks.</li>
</ul>

<h2>Common Patterns</h2>
<ul>
  <li><strong>Morning:</strong> Deep work (writing, coding, strategy) — 2-3 hour block</li>
  <li><strong>Late morning:</strong> Meetings and collaboration</li>
  <li><strong>After lunch:</strong> Administrative tasks, emails, quick wins</li>
  <li><strong>Afternoon:</strong> Second deep work block or creative work</li>
  <li><strong>End of day:</strong> Planning tomorrow''s blocks (10 minutes)</li>
</ul>

<p><strong>Key takeaway:</strong> What gets scheduled gets done. If you only try one productivity technique, make it time blocking.</p>',
  'productivity', 5, 30, '📅', 'beginner',
  '["time blocking", "scheduling", "focus", "productivity", "planning"]', true
),

-- Article 22: Pomodoro Technique
(
  'The Pomodoro Technique: Beat Procrastination in 25-Minute Chunks',
  'The Pomodoro Technique breaks work into focused 25-minute intervals with short breaks. It''s deceptively simple and remarkably effective against procrastination.',
  '<h2>The Method</h2>
<ul>
  <li><strong>1.</strong> Choose a task</li>
  <li><strong>2.</strong> Set a timer for 25 minutes (one "Pomodoro")</li>
  <li><strong>3.</strong> Work with full focus until the timer rings — no switching tasks, no checking phone</li>
  <li><strong>4.</strong> Take a 5-minute break</li>
  <li><strong>5.</strong> After 4 Pomodoros, take a longer 15-30 minute break</li>
</ul>

<h2>Why It Works</h2>
<p><strong>Reduces overwhelm:</strong> "Work for 25 minutes" is much less intimidating than "write the whole report." Starting is the hardest part, and Pomodoro makes starting easy.</p>
<p><strong>Creates urgency:</strong> A ticking timer adds gentle pressure that fights procrastination.</p>
<p><strong>Forces breaks:</strong> Regular breaks prevent burnout and maintain quality. Your brain consolidates information during rest.</p>

<h2>Pro Tips</h2>
<ul>
  <li>If a distraction pops into your head, write it on a "distraction list" and return to your task. Handle it during a break.</li>
  <li>If a task takes less than one Pomodoro, batch similar small tasks together.</li>
  <li>Track how many Pomodoros tasks take. Over time, you''ll estimate effort accurately.</li>
  <li>Experiment with 50-minute Pomodoros for deep creative work. The original 25 minutes isn''t sacred.</li>
</ul>

<p><strong>Key takeaway:</strong> You don''t need motivation — you need a timer. Start one Pomodoro and let momentum carry you.</p>',
  'productivity', 4, 25, '🍅', 'beginner',
  '["pomodoro", "focus", "procrastination", "time management"]', true
),

-- Article 23: Digital Declutter
(
  'Digital Declutter: Reclaim Your Attention in a Noisy World',
  'Your phone checks you more than you check it. A digital declutter reduces noise, reclaims focus, and gives you back hours of your week.',
  '<h2>The Problem</h2>
<p>The average person checks their phone 96 times per day and spends 3+ hours on social media. Each notification breaks focus, and it takes 23 minutes to fully regain concentration. That''s an enormous hidden cost.</p>

<h2>The 7-Day Digital Declutter</h2>
<ul>
  <li><strong>Day 1 — Audit:</strong> Check screen time stats. Identify your top 3 time-sink apps. No judgement, just awareness.</li>
  <li><strong>Day 2 — Notifications:</strong> Turn off ALL non-essential notifications. Keep calls, texts from favourites, and calendar. Everything else: off.</li>
  <li><strong>Day 3 — Home screen:</strong> Move social media and news apps to the last page or into a folder. Remove them from your home screen. Add friction.</li>
  <li><strong>Day 4 — Unsubscribe:</strong> Open email and unsubscribe from every newsletter you don''t read. Use a tool like Unroll.me if needed.</li>
  <li><strong>Day 5 — App audit:</strong> Delete apps you haven''t used in 30 days. If you need them, you can re-download.</li>
  <li><strong>Day 6 — Boundaries:</strong> Set "do not disturb" hours. No screens 1 hour before bed. No phone during meals.</li>
  <li><strong>Day 7 — Reflect:</strong> Compare your screen time to Day 1. Notice how you feel. Decide what to keep.</li>
</ul>

<h2>Maintenance</h2>
<p>Repeat this audit monthly. Digital clutter accumulates silently — like dust, it needs regular cleaning.</p>

<p><strong>Key takeaway:</strong> You don''t need willpower to resist your phone — you need to redesign your environment so distractions require effort.</p>',
  'productivity', 5, 30, '📱', 'beginner',
  '["digital declutter", "phone", "attention", "social media", "focus"]', true
),

-- Article 24: SMART Goal Setting
(
  'SMART Goals: Turn Vague Wishes Into Achievable Plans',
  'Most goals fail because they''re too vague. The SMART framework transforms "I want to get fit" into a concrete, trackable, achievable plan.',
  '<h2>The SMART Framework</h2>
<ul>
  <li><strong>S — Specific:</strong> What exactly do you want? "Lose weight" → "Lose 5kg of body fat"</li>
  <li><strong>M — Measurable:</strong> How will you track progress? "I''ll weigh myself weekly and track body measurements"</li>
  <li><strong>A — Achievable:</strong> Is this realistic? Losing 5kg in 3 months is healthy. In 2 weeks is not.</li>
  <li><strong>R — Relevant:</strong> Does this align with your bigger objectives? Why does this matter to you?</li>
  <li><strong>T — Time-bound:</strong> What''s your deadline? "By June 30th" creates urgency and focus.</li>
</ul>

<h2>Examples</h2>
<p><strong>Vague:</strong> "I want to save more money"<br/>
<strong>SMART:</strong> "I will save $3,000 in my emergency fund by December 31st by automatically transferring $250 on the 1st of each month."</p>

<p><strong>Vague:</strong> "I want to read more"<br/>
<strong>SMART:</strong> "I will read 12 books this year by reading 20 pages every evening before bed."</p>

<h2>Common Mistakes</h2>
<ul>
  <li><strong>Too many goals:</strong> Focus on 2-3 at a time. More than that splits your energy.</li>
  <li><strong>No systems:</strong> Goals set the direction, but systems (daily habits) drive progress.</li>
  <li><strong>All-or-nothing thinking:</strong> Missing a day doesn''t erase progress. Resume tomorrow.</li>
</ul>

<p><strong>Key takeaway:</strong> A goal without a plan is just a wish. SMART turns wishes into plans with built-in accountability.</p>',
  'productivity', 5, 25, '🎯', 'beginner',
  '["goals", "SMART", "planning", "achievement", "habits"]', true
),

-- Article 25: Deep Work
(
  'Deep Work: How to Produce Your Best Work in a Distracted World',
  'Cal Newport''s Deep Work concept is simple: extended periods of undistracted focus produce your most valuable output. Here''s how to create deep work habits.',
  '<h2>What Is Deep Work?</h2>
<p>Deep work is cognitively demanding work performed in a state of distraction-free concentration. It''s the opposite of "shallow work" — email, meetings, administrative tasks that feel productive but create little value.</p>

<h2>The Deep Work Equation</h2>
<p><strong>High-Quality Work = Time Spent × Intensity of Focus</strong></p>
<p>2 hours of deep work beats 5 hours of distracted work. Every time you switch contexts (check email, respond to a message), you pay a "switching cost" that can last 15-25 minutes.</p>

<h2>How to Practice Deep Work</h2>
<ul>
  <li><strong>Schedule it:</strong> Block 2-4 hours daily for deep work. Morning is best for most people.</li>
  <li><strong>Eliminate distractions:</strong> Phone in another room. Close email. Use website blockers if needed.</li>
  <li><strong>Create a ritual:</strong> Same time, same place, same start routine. Reduces the activation energy to begin.</li>
  <li><strong>Set a clear outcome:</strong> "Write 1,000 words" is better than "work on the article." Clarity prevents drift.</li>
  <li><strong>Track your hours:</strong> Keep a tally of deep work hours per week. Aim for 15-20 hours as a knowledge worker.</li>
</ul>

<h2>The 4 Rules</h2>
<ul>
  <li><strong>1. Work deeply</strong> — schedule and protect focused time</li>
  <li><strong>2. Embrace boredom</strong> — resist the urge to check your phone during idle moments</li>
  <li><strong>3. Quit social media</strong> — or at least reduce it dramatically</li>
  <li><strong>4. Drain the shallows</strong> — batch and minimise administrative work</li>
</ul>

<p><strong>Key takeaway:</strong> In a world of constant distraction, the ability to focus deeply is a superpower — and it''s trainable.</p>',
  'productivity', 6, 35, '🧑‍💻', 'intermediate',
  '["deep work", "focus", "concentration", "productivity", "Cal Newport"]', true
),

-- Article 26: Habit Stacking
(
  'Habit Stacking: Build New Habits by Linking Them to Existing Ones',
  'The easiest way to build a new habit is to attach it to one you already do. Habit stacking leverages existing neural pathways to make new behaviours stick.',
  '<h2>The Science</h2>
<p>Your brain is wired for efficiency. Existing habits have strong neural pathways — they happen almost automatically. By linking a new habit to an existing one, you borrow that automation. This is called "synaptic pruning" — your brain strengthens frequently used connections.</p>

<h2>The Formula</h2>
<p><strong>"After I [CURRENT HABIT], I will [NEW HABIT]."</strong></p>
<ul>
  <li>"After I pour my morning coffee, I will write 3 things I''m grateful for."</li>
  <li>"After I sit down at my desk, I will write my top 3 priorities for the day."</li>
  <li>"After I finish lunch, I will take a 10-minute walk."</li>
  <li>"After I brush my teeth at night, I will read for 10 minutes."</li>
</ul>

<h2>Rules for Effective Stacking</h2>
<ul>
  <li><strong>Match frequency:</strong> If the anchor habit is daily, the new habit should be daily too.</li>
  <li><strong>Match context:</strong> "After I park my car at work" works because you''re already in transition mode.</li>
  <li><strong>Keep it small:</strong> The new habit should take under 5 minutes initially. Expand later.</li>
  <li><strong>One stack at a time:</strong> Don''t build 5 habit stacks simultaneously. Master one, then add another.</li>
</ul>

<h2>Building a Chain</h2>
<p>Once your first stack is solid (2-3 weeks), you can chain: "After I pour coffee → write gratitudes → meditate for 5 minutes." This creates a powerful morning sequence that runs on autopilot.</p>

<p><strong>Key takeaway:</strong> You don''t need motivation to build habits — you need an anchor. Find a strong existing habit and stack the new one right after it.</p>',
  'productivity', 4, 25, '🔗', 'beginner',
  '["habits", "habit stacking", "behaviour change", "routine", "James Clear"]', true
),

-- Article 27: Inbox Zero
(
  'Inbox Zero: Tame Your Email in 30 Minutes a Day',
  'Email overload isn''t about volume — it''s about indecision. Inbox Zero is a system for processing email decisively so your inbox stays empty and your mind stays clear.',
  '<h2>What Inbox Zero Really Means</h2>
<p>It''s not about having zero emails. It''s about having zero emails that need a <strong>decision</strong>. Your inbox should be a processing queue, not a storage system.</p>

<h2>The 4-Action Rule</h2>
<p>For every email, choose one action immediately:</p>
<ul>
  <li><strong>Delete/Archive:</strong> Not relevant? Remove it. You can search for it later if needed.</li>
  <li><strong>Delegate:</strong> Someone else should handle this? Forward it with a clear ask.</li>
  <li><strong>Respond:</strong> Takes under 2 minutes? Reply now and archive.</li>
  <li><strong>Defer:</strong> Needs more time? Move to a "To Do" folder or add to your task manager. Schedule time to handle it.</li>
</ul>

<h2>Daily Email Schedule</h2>
<ul>
  <li><strong>Morning (10 min):</strong> Process overnight emails. Quick responses and prioritisation.</li>
  <li><strong>Midday (10 min):</strong> Second pass. Handle deferred items.</li>
  <li><strong>End of day (10 min):</strong> Final sweep. Clear everything. Start tomorrow clean.</li>
</ul>

<h2>Prevention</h2>
<ul>
  <li>Unsubscribe aggressively — every newsletter you don''t read is future work.</li>
  <li>Use filters/rules to auto-sort recurring emails.</li>
  <li>Turn off email notifications between processing sessions.</li>
</ul>

<p><strong>Key takeaway:</strong> Email is other people''s agenda for your time. Process it on YOUR schedule, not theirs.</p>',
  'productivity', 5, 25, '📧', 'beginner',
  '["email", "inbox zero", "organisation", "productivity", "communication"]', true
),

-- Article 28: Weekly Review Ritual
(
  'The Weekly Review: How to Stay on Track Every Single Week',
  'A 30-minute weekly review prevents you from drifting off course. Reflect on what worked, what didn''t, and plan the week ahead with clarity.',
  '<h2>Why Weekly Reviews?</h2>
<p>Without regular reviews, you operate reactively — responding to whatever feels urgent. A weekly review gives you a bird''s-eye view, ensuring you work on what''s important, not just what''s loud.</p>

<h2>The 30-Minute Framework</h2>
<p><strong>Part 1 — Clear (10 min):</strong></p>
<ul>
  <li>Process all inboxes (email, notes, messages) to zero.</li>
  <li>Review calendar for the past week — any loose ends?</li>
  <li>Check task manager — update, complete, or delete stale tasks.</li>
</ul>

<p><strong>Part 2 — Reflect (10 min):</strong></p>
<ul>
  <li>What were my 3 biggest wins this week?</li>
  <li>What didn''t go as planned? Why?</li>
  <li>What did I learn?</li>
  <li>Rate my week 1-10 and note why.</li>
</ul>

<p><strong>Part 3 — Plan (10 min):</strong></p>
<ul>
  <li>Review upcoming calendar for next week.</li>
  <li>Set 3 "Big Rocks" — the most important outcomes for next week.</li>
  <li>Break Big Rocks into specific tasks with time blocks.</li>
  <li>Identify potential obstacles and plan around them.</li>
</ul>

<h2>Best Time</h2>
<p>Friday afternoon or Sunday evening work best. Friday gives you weekend peace of mind. Sunday sets you up for a focused Monday.</p>

<p><strong>Key takeaway:</strong> 30 minutes of planning saves hours of confusion. The weekly review is the habit that makes all other habits work.</p>',
  'productivity', 5, 30, '📋', 'beginner',
  '["weekly review", "planning", "reflection", "GTD", "organisation"]', true
),

-- Article 29: Saying No Gracefully
(
  'The Art of Saying No: Protect Your Time Without Burning Bridges',
  'Every "yes" to something unimportant is a "no" to something that matters. Learn to decline requests gracefully while strengthening relationships.',
  '<h2>Why Saying No Is Hard</h2>
<p>We fear disappointing people, missing opportunities, or being seen as unhelpful. But saying yes to everything leads to overcommitment, resentment, and mediocre results on things that actually matter.</p>

<h2>The Decision Framework</h2>
<p>Before responding to any request, ask:</p>
<ul>
  <li><strong>Does this align with my current priorities?</strong> If not, it''s a distraction.</li>
  <li><strong>Would I be excited to do this if it were tomorrow?</strong> Future commitments feel easy — but they all become "tomorrow" eventually.</li>
  <li><strong>What am I saying no to by saying yes?</strong> Every commitment has an opportunity cost.</li>
</ul>

<h2>Graceful Scripts</h2>
<ul>
  <li><strong>The redirect:</strong> "I can''t take this on, but [Name] would be great for this."</li>
  <li><strong>The rain check:</strong> "I''m at capacity this month. Can we revisit this in March?"</li>
  <li><strong>The honest decline:</strong> "I appreciate you thinking of me, but I need to focus on [priority] right now."</li>
  <li><strong>The boundary:</strong> "I don''t take meetings on Wednesdays — it''s my deep work day. How about Thursday?"</li>
</ul>

<h2>Key Principles</h2>
<ul>
  <li>Say no to the request, not the person. Be warm but firm.</li>
  <li>Don''t over-explain or apologise excessively — it weakens your boundary.</li>
  <li>A clear "no" is kinder than a reluctant "yes" that leads to poor results.</li>
</ul>

<p><strong>Key takeaway:</strong> "No" is a complete sentence. But a thoughtful "no" with a brief reason preserves the relationship.</p>',
  'productivity', 5, 30, '🙅', 'intermediate',
  '["boundaries", "saying no", "time management", "communication", "priorities"]', true
),

-- Article 30: Energy Management
(
  'Energy Management: Work With Your Body, Not Against It',
  'Time management is incomplete without energy management. Learn to match your tasks to your energy levels for peak performance throughout the day.',
  '<h2>Time vs. Energy</h2>
<p>You have 24 hours in a day — that never changes. But your energy fluctuates dramatically. Working on your hardest task during a low-energy period is like swimming upstream. Match task difficulty to energy level and everything becomes easier.</p>

<h2>Your Energy Cycle</h2>
<p>Most people follow a predictable pattern (chronotype-dependent):</p>
<ul>
  <li><strong>Peak (morning for most):</strong> Highest focus, best for analytical and creative work. Guard this time fiercely.</li>
  <li><strong>Trough (early-mid afternoon):</strong> Lowest energy. Best for routine tasks — email, admin, meetings.</li>
  <li><strong>Recovery (late afternoon):</strong> Energy rebounds. Good for brainstorming and creative tasks that benefit from a relaxed mind.</li>
</ul>

<h2>The 4 Energy Pillars</h2>
<ul>
  <li><strong>Physical:</strong> Sleep, nutrition, exercise, hydration. These are non-negotiable foundations.</li>
  <li><strong>Emotional:</strong> Positive relationships, gratitude, managing stress. Emotional drain kills productivity faster than physical fatigue.</li>
  <li><strong>Mental:</strong> Focus practices, single-tasking, taking breaks. Your brain is a muscle — it needs rest between sets.</li>
  <li><strong>Spiritual:</strong> Purpose, values alignment, meaningful work. When your work matters to you, energy flows naturally.</li>
</ul>

<h2>Quick Energy Boosters</h2>
<ul>
  <li>10-minute walk (increases energy for 2 hours)</li>
  <li>Cold water on your face</li>
  <li>5 deep breaths (activates parasympathetic nervous system)</li>
  <li>A brief social interaction (humans are social animals)</li>
</ul>

<p><strong>Key takeaway:</strong> Manage your energy, not just your time. The right task at the right energy level multiplies your output.</p>',
  'productivity', 6, 35, '⚡', 'intermediate',
  '["energy", "productivity", "performance", "chronotype", "self-management"]', true
)

ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 6. SEED: Quiz Questions
----------------------------------------------------------------------

-- ===== Personal Finance Quizzes =====

-- Article 1: Budgeting Basics (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(1, 'What is the first step in creating a budget?', '["Set spending limits","Track your income","Open a savings account","Cancel all subscriptions"]', 1, 10),
(1, 'How often should you review your budget?', '["Once a year","Monthly","Weekly","Only when you overspend"]', 2, 10),
(1, 'Should you use gross or net income for budgeting?', '["Gross (before taxes)","Net (after taxes)","Either one works","Minimum wage amount"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 2: Emergency Fund (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(2, 'How many months of expenses should an emergency fund cover?', '["1-2 months","3-6 months","12 months","As much as possible"]', 1, 10),
(2, 'Where is the best place to keep your emergency fund?', '["Under your mattress","In stocks","In a high-yield savings account","In cryptocurrency"]', 2, 10),
(2, 'What is a good initial emergency fund mini-goal?', '["$100","$500","$1,000","$5,000"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 3: Debt Payoff (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(3, 'The Debt Snowball method focuses on paying off debts with the:', '["Highest interest rate first","Largest balance first","Smallest balance first","Oldest debt first"]', 2, 10),
(3, 'Which method saves the most money on interest overall?', '["Snowball","Avalanche","They are identical","Minimum payments only"]', 1, 10),
(3, 'What should you NOT do while paying off debt?', '["Negotiate lower rates","Make minimum payments","Take on new debt","Use a structured plan"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 4: Compound Interest (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(4, 'What does the Rule of 72 help you estimate?', '["Your tax rate","How long to double your money","Monthly budget needs","Credit score improvement"]', 1, 10),
(4, 'At 8% annual return, approximately how long does it take to double your money?', '["3 years","6 years","9 years","15 years"]', 2, 10),
(4, 'Why does starting to invest early matter so much?', '["Tax benefits are higher for young people","Compound interest accelerates over time","Stocks are cheaper when you are young","Banks give higher rates to young investors"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 5: Investing for Beginners (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(5, 'What percentage of active fund managers underperform the index over 15 years?', '["About 50%","About 70%","About 90%","About 30%"]', 2, 10),
(5, 'What is a key advantage of index funds?', '["Guaranteed returns","High management fees","Low fees and diversification","Only available to professionals"]', 2, 10),
(5, 'Which saying best captures the investing advice in this article?', '["Buy low, sell high","Time in the market beats timing the market","Don''t put all eggs in one basket","Cash is king"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 6: 50/30/20 Rule (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(6, 'In the 50/30/20 rule, what does the 20% represent?', '["Needs","Wants","Savings and debt payoff","Entertainment"]', 2, 10),
(6, 'Why does the 50/30/20 rule work better than detailed budgets for most people?', '["It saves more money","It reduces decision fatigue","It eliminates all wants","It requires no tracking"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 7: Credit Score (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(7, 'What is the single biggest factor affecting your credit score?', '["Credit utilisation","Length of history","Payment history","Number of accounts"]', 2, 10),
(7, 'What credit utilisation percentage should you stay under?', '["50%","30%","80%","10%"]', 1, 10),
(7, 'Why should you keep old credit cards open?', '["For emergency spending","To increase length of credit history","To earn more rewards","Banks require it"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 8: Side Income (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(8, 'Which side income idea has the lowest barrier to entry?', '["Web development","Online courses","Freelance writing","Consulting"]', 2, 10),
(8, 'How long should you try a side income idea before evaluating?', '["1 week","1 month","3 months","1 year"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 9: Tax Saving (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(9, 'Which is more valuable — a $1,000 tax deduction or a $1,000 tax credit?', '["They are equal","Tax deduction","Tax credit","Depends on your income"]', 2, 10),
(9, 'Which account has a triple tax advantage?', '["401(k)","Roth IRA","HSA","Traditional IRA"]', 2, 10),
(9, 'What should you do FIRST when saving on taxes?', '["Open a Roth IRA","Max employer 401(k) match","Buy a house","Start a business"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 10: Retirement Planning (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(10, 'According to the 4% rule, how much do you need saved to withdraw $40,000/year?', '["$400,000","$600,000","$1,000,000","$2,000,000"]', 2, 10),
(10, 'What matters MORE for retirement savings?', '["Investment returns","Savings rate","Stock picking","Market timing"]', 1, 10)
ON CONFLICT DO NOTHING;

-- ===== Health Quizzes =====

-- Article 11: Morning Routines (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(11, 'Why is the morning the best time for important habits?', '["You have more free time","Willpower is highest in the morning","Your metabolism is fastest","Your brain is still asleep"]', 1, 10),
(11, 'What should you avoid first thing in the morning?', '["Drinking water","Stretching","Checking your phone","Eating breakfast"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 12: Hydration (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(12, 'How much can mild dehydration reduce cognitive performance?', '["Up to 5%","Up to 10%","Up to 25%","Up to 50%"]', 2, 10),
(12, 'What is a good hydration formula based on body weight?', '["10-15 ml per kg","20-25 ml per kg","30-35 ml per kg","50-60 ml per kg"]', 2, 10),
(12, 'What colour urine indicates good hydration?', '["Clear","Pale yellow","Dark yellow","Orange"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 13: Sleep Hygiene (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(13, 'What is the optimal room temperature for sleep?', '["22-25°C","18-20°C","15-17°C","25-28°C"]', 1, 10),
(13, 'What is the half-life of caffeine?', '["1-2 hours","3-4 hours","5-6 hours","8-10 hours"]', 2, 10),
(13, 'Why does alcohol actually worsen sleep quality?', '["It causes nightmares","It fragments sleep cycles","It raises body temperature","It causes dehydration"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 14: Meal Prep (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(14, 'People who meal prep eat how many more vegetables on average?', '["10% more","20% more","30% more","50% more"]', 2, 10),
(14, 'How long do most prepped meals last in the refrigerator?', '["1-2 days","2-3 days","4-5 days","7-10 days"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 15: Stretching (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(15, 'Which muscles does prolonged sitting tighten the most?', '["Biceps and triceps","Hip flexors and chest","Calves and forearms","Glutes and hamstrings"]', 1, 10),
(15, 'How long is the recommended daily stretching routine for desk workers?', '["5 minutes","10 minutes","20 minutes","30 minutes"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 16: Mental Health Check-In (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(16, 'How many questions does the weekly mental health check-in include?', '["3","5","7","10"]', 1, 10),
(16, 'What total score range indicates you should seek support?', '["15-19","10-14","Below 10","Below 5"]', 2, 10),
(16, 'Which of these is NOT one of the five check-in areas?', '["Energy","Mood","Productivity","Connection"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 17: Sugar Reduction (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(17, 'What is the WHO recommended limit for daily added sugar?', '["10g","25g","50g","75g"]', 1, 10),
(17, 'What should you eliminate FIRST when cutting sugar?', '["Sugary snacks","Sugary drinks","Condiments","Baked goods"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 18: Protein Intake (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(18, 'How much protein per kg of body weight is recommended for active individuals?', '["0.5-0.8g","0.8-1.2g","1.6-2.2g","3.0-4.0g"]', 2, 10),
(18, 'What is the thermic effect of protein?', '["5-10%","10-15%","20-30%","40-50%"]', 2, 10),
(18, 'Which meal do most people undereat protein at?', '["Breakfast","Lunch","Dinner","Snacks"]', 0, 10)
ON CONFLICT DO NOTHING;

-- Article 19: HIIT Benefits (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(19, 'What does EPOC stand for in HIIT training?', '["Extra Physical Output Capacity","Excess Post-Exercise Oxygen Consumption","Enhanced Protein Oxidation Cycle","Exercise Performance Optimisation Coefficient"]', 1, 10),
(19, 'How many HIIT sessions per week are recommended for beginners?', '["1","2","4","7"]', 1, 10),
(19, '20 minutes of HIIT is equivalent to approximately how many minutes of moderate cardio?', '["25 minutes","35 minutes","45 minutes","60 minutes"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 20: Meditation (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(20, 'What is the primary "anchor" used in basic meditation?', '["A mantra","Your breath","A candle flame","Background music"]', 1, 10),
(20, 'By how much can meditation reduce cortisol levels?', '["Up to 5%","Up to 10%","Up to 25%","Up to 50%"]', 2, 10)
ON CONFLICT DO NOTHING;

-- ===== Productivity Quizzes =====

-- Article 21: Time Blocking (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(21, 'How much buffer time should you add to task estimates?', '["10%","25%","50%","100%"]', 1, 10),
(21, 'When should you plan tomorrow''s time blocks?', '["First thing in the morning","During lunch","At the end of today","On Sunday evening"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 22: Pomodoro Technique (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(22, 'How long is one standard Pomodoro?', '["15 minutes","20 minutes","25 minutes","30 minutes"]', 2, 10),
(22, 'After how many Pomodoros should you take a longer break?', '["2","3","4","5"]', 2, 10),
(22, 'What should you do when a distraction pops into your head during a Pomodoro?', '["Stop and handle it immediately","Ignore it completely","Write it on a distraction list","Send a quick message about it"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 23: Digital Declutter (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(23, 'How many times does the average person check their phone daily?', '["32 times","64 times","96 times","150 times"]', 2, 10),
(23, 'How long does it take to fully regain concentration after a notification?', '["5 minutes","10 minutes","23 minutes","45 minutes"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 24: SMART Goals (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(24, 'What does the "A" in SMART stand for?', '["Actionable","Ambitious","Achievable","Attractive"]', 2, 10),
(24, 'How many goals should you focus on at a time?', '["1","2-3","5-7","As many as possible"]', 1, 10),
(24, 'Which is a SMART goal?', '["Get healthier","Lose weight","Run a 5K by March 31st","Exercise more often"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 25: Deep Work (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(25, 'What is the "switching cost" when you check email during deep work?', '["2-5 minutes","5-10 minutes","15-25 minutes","30-45 minutes"]', 2, 10),
(25, 'How many hours of deep work per week should a knowledge worker aim for?', '["5-10","10-15","15-20","25-30"]', 2, 10),
(25, 'What is the Deep Work equation?', '["Time + Effort = Results","High Quality Work = Time × Intensity of Focus","Productivity = Hours - Distractions","Output = Input × Motivation"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 26: Habit Stacking (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(26, 'What is the habit stacking formula?', '["If I want X, I must do Y","After I [current habit], I will [new habit]","Every day at [time], I will [habit]","Before I sleep, I will [habit]"]', 1, 10),
(26, 'How long should a new stacked habit initially take?', '["Under 2 minutes","Under 5 minutes","Under 15 minutes","Under 30 minutes"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 27: Inbox Zero (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(27, 'What does "Inbox Zero" actually mean?', '["Having zero emails total","Having zero unread emails","Having zero emails needing a decision","Deleting all emails daily"]', 2, 10),
(27, 'What should you do with an email that takes under 2 minutes to handle?', '["Defer it","Delete it","Respond now and archive","Flag it for later"]', 2, 10),
(27, 'How many times per day should you process email?', '["Once","Twice","Three times","Continuously"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 28: Weekly Review (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(28, 'How long should a weekly review take?', '["10 minutes","30 minutes","1 hour","2 hours"]', 1, 10),
(28, 'How many "Big Rocks" should you set for each week?', '["1","3","5","7"]', 1, 10)
ON CONFLICT DO NOTHING;

-- Article 29: Saying No (2 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(29, 'What question helps you evaluate future commitments?', '["Can I afford it?","Would I be excited if it were tomorrow?","Is this person important?","Will this make money?"]', 1, 10),
(29, 'What is the best way to say no?', '["Ghost the person","Give a long apology","Say no to the request, not the person","Always say yes then cancel later"]', 2, 10)
ON CONFLICT DO NOTHING;

-- Article 30: Energy Management (3 questions)
INSERT INTO content_quiz (article_id, question, options, correct_index, xp_reward) VALUES
(30, 'When is energy typically at its lowest for most people?', '["Early morning","Late morning","Early-mid afternoon","Late evening"]', 2, 10),
(30, 'How many energy pillars are described in the article?', '["2","3","4","5"]', 2, 10),
(30, 'How long does a 10-minute walk boost your energy?', '["30 minutes","1 hour","2 hours","4 hours"]', 2, 10)
ON CONFLICT DO NOTHING;
