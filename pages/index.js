
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/components/CartContext';
import ProductModal from '@/components/ProductModal';

const DESCRIPTION_VISIBLE_MS = 4000;
const STATIC_GOOGLE_REVIEWS = [
	{
		author_name: 'Destiny R.',
		rating: 5,
		text: 'Absolutely love Bobanest! The taro milk tea is perfectly sweet and the boba is always fresh. My go-to spot in Zephyrhills!',
		relative_time_description: '2 weeks ago',
		profile_photo_url: null,
	},
	{
		author_name: 'Marcus T.',
		rating: 5,
		text: 'Best bubble tea I have had! The custom fruit tea builder is amazing — I made a strawberry-mango combo with popping boba and it was incredible.',
		relative_time_description: '1 month ago',
		profile_photo_url: null,
	},
	{
		author_name: 'Priya L.',
		rating: 5,
		text: 'Super friendly staff and the drinks are always consistent. The brown sugar milk tea is out of this world. Highly recommend!',
		relative_time_description: '3 weeks ago',
		profile_photo_url: null,
	},
	{
		author_name: 'Jonathan M.',
		rating: 5,
		text: 'Online ordering is so easy and the drinks were ready right on time. This place has become our family Friday treat!',
		relative_time_description: '1 month ago',
		profile_photo_url: null,
	},
	{
		author_name: 'Samantha K.',
		rating: 5,
		text: 'Love the rewards program — I have already redeemed points twice! Great flavors and the staff always make it with so much care.',
		relative_time_description: '2 months ago',
		profile_photo_url: null,
	},
];

// ── Newsletter Section ────────────────────────────────────────────
function NewsletterSection() {
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [status, setStatus] = useState('');
	const handleSubscribe = async (e) => {
		e.preventDefault();
		setStatus('loading');
		try {
			const res = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, name }),
			});
			setStatus(res.ok ? 'success' : 'error');
		} catch {
			setStatus('error');
		}
	};
	return (
		<section className="bg-[#150d09] py-16 border-t border-white/5">
			<div className="max-w-2xl mx-auto px-4 text-center">
				<div className="text-4xl mb-3">📬</div>
				<h2 className="text-3xl font-extrabold text-[#f5e6c8] mb-2">Stay in the Loop</h2>
				<p className="text-[#b89070] mb-8">Get exclusive deals, new flavors, and event updates. No spam, ever.</p>
				{status === 'success' ? (
					<div className="bg-[#2a1812] border border-[#e8a33d]/30 text-[#e8a33d] rounded-2xl py-6 px-8">
						<div className="text-3xl mb-2">🎉</div>
						<p className="font-bold text-lg text-[#f5e6c8]">You&apos;re subscribed!</p>
						<p className="text-sm mt-1 text-[#b89070]">Welcome to the Bobanest family.</p>
					</div>
				) : (
					<form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
						<input type="text" placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)}
							className="flex-1 bg-[#2a1812] border border-white/10 text-[#f5e6c8] placeholder-[#6b4e37] p-3 rounded-xl text-sm focus:outline-none focus:border-[#e8a33d]/50" />
						<input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required
							className="flex-1 bg-[#2a1812] border border-white/10 text-[#f5e6c8] placeholder-[#6b4e37] p-3 rounded-xl text-sm focus:outline-none focus:border-[#e8a33d]/50" />
						<button type="submit" disabled={status === 'loading'}
							className="bg-[#e8a33d] text-[#1a0f0c] font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition disabled:opacity-50 whitespace-nowrap">
							{status === 'loading' ? 'Subscribing…' : 'Subscribe'}
						</button>
					</form>
				)}
				{status === 'error' && <p className="text-red-400 text-sm mt-3">Something went wrong. Please try again.</p>}
			</div>
		</section>
	);
}

// ── Dark Product Card ─────────────────────────────────────────────
function DarkProductCard({ product, promo, isNew, activeDescriptionId, onShowDescription, onAddToCart }) {
	return (
		<div className="bg-[#2a1812] rounded-2xl border border-white/8 p-4 text-center hover:border-[#e8a33d]/30 hover:bg-[#31201a] transition relative group">
			{promo && (
				<div className={`absolute top-2 left-2 ${promo.color} text-white text-xs font-bold px-2 py-1 rounded-full z-10`}>
					{promo.text}
				</div>
			)}
			{isNew && (
				<div className="absolute top-2 right-2 bg-[#4a7c30] text-white text-xs font-bold px-2 py-1 rounded-full z-10">NEW</div>
			)}
			<div className="h-28 flex items-center justify-center mb-3">
				<img src={product.imageUrl} alt={product.name}
					className="max-h-full max-w-full object-contain cursor-pointer drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
					onClick={() => onShowDescription(product._id)}
					onTouchStart={() => onShowDescription(product._id)} />
			</div>
			<h3 className="font-bold text-[#f5e6c8] text-sm leading-snug">{product.name}</h3>
			{activeDescriptionId === product._id && (
				<p className="text-xs text-[#b89070] mt-1 leading-relaxed">{product.description}</p>
			)}
			<p className="text-[#e8a33d] font-bold mt-1">${product.price}</p>
			<button onClick={() => onAddToCart(product)}
				className="mt-3 bg-[#e8a33d] text-[#1a0f0c] px-4 py-1.5 rounded-full text-sm font-bold hover:bg-amber-400 transition w-full">
				Add to Cart
			</button>
		</div>
	);
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Home() {
	const fallbackHero = {
		imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=1600&q=80',
		title: 'Real Tea. Your Build.',
		subtitle: 'Handcrafted bubble tea made fresh daily in Zephyrhills, FL.',
	};
	const [heroData, setHeroData] = useState({ ...fallbackHero });
	const [allProducts, setAllProducts] = useState([]);
	const [promotions, setPromotions] = useState([]);
	const [modifierGroups, setModifierGroups] = useState([]);
	const [modalProduct, setModalProduct] = useState(null);
	const [loadingData, setLoadingData] = useState(false);
	const { addToCart, openCart } = useCart();
	const [showQuickActionBar, setShowQuickActionBar] = useState(false);
	const [activeDescriptionProductId, setActiveDescriptionProductId] = useState(null);
	const [activeMenuTab, setActiveMenuTab] = useState('All');
	const descriptionTimeoutRef = useRef(null);
	const normalizeMenuCategory = (category) => {
		const normalized = String(category || '').toLowerCase().trim();
		if (normalized.includes('milk')) return 'Milk Tea';
		if (normalized.includes('fruit')) return 'Fruit Tea';
		if (normalized.includes('signature') || normalized.includes('specialty') || normalized.includes('special')) return 'Signature';
		if (normalized.includes('smooth')) return 'Smoothie';
		return '';
	};

	const showDescription = (productId) => {
		setActiveDescriptionProductId(productId);
		if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
		descriptionTimeoutRef.current = setTimeout(() => {
			setActiveDescriptionProductId(null);
			descriptionTimeoutRef.current = null;
		}, DESCRIPTION_VISIBLE_MS);
	};

	useEffect(() => {
		const fetchJsonWithTimeout = async (url, fallback, timeoutMs = 6000) => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const res = await fetch(url, { signal: controller.signal });
				if (!res.ok) return fallback;
				return await res.json();
			} catch {
				return fallback;
			} finally {
				clearTimeout(timeout);
			}
		};

		let cancelled = false;
		const load = async () => {
			setLoadingData(true);
			const [hero, products, promos, modifiers] = await Promise.all([
				fetchJsonWithTimeout('/api/admin/hero', {}),
				fetchJsonWithTimeout('/api/admin/products', []),
				fetchJsonWithTimeout('/api/admin/promotions?active=true', []),
				fetchJsonWithTimeout('/api/admin/modifiers', []),
			]);
			if (cancelled) return;
			const safeProducts = Array.isArray(products) ? products : [];
			const safePromos = Array.isArray(promos) ? promos : [];
			const safeHero = hero && typeof hero === 'object' ? hero : {};
			const normalizedHeroTitle = (safeHero.title || fallbackHero.title)
				.replace(/\bReal Fruit\.?\s*/gi, '')
				.replace(/\s{2,}/g, ' ')
				.trim();
			setHeroData({
				imageUrl: safeHero.imageUrl || fallbackHero.imageUrl,
				title: normalizedHeroTitle || fallbackHero.title,
				subtitle: safeHero.subtitle || fallbackHero.subtitle,
			});
			setAllProducts(safeProducts);
			setPromotions(safePromos);
			setModifierGroups(Array.isArray(modifiers) ? modifiers : []);
			setLoadingData(false);
		};
		load();
		return () => { cancelled = true; };
	}, []);

	useEffect(() => {
		const handleScroll = () => setShowQuickActionBar(window.scrollY > 240);
		window.addEventListener('scroll', handleScroll);
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => () => {
		if (descriptionTimeoutRef.current) clearTimeout(descriptionTimeoutRef.current);
	}, []);

	const getProductPromotion = (product) => {
		for (const promo of promotions) {
			const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
			const applies = applicableProductIds.length === 0 || applicableProductIds.includes(product._id);
			if (!applies) continue;
			if (promo.type === 'bogo') return { text: 'Buy 1 Get 1 Free', color: 'bg-red-600' };
			if (promo.type === 'percentage') return { text: `${promo.value}% OFF`, color: 'bg-orange-500' };
			if (promo.type === 'fixed') return { text: `$${promo.value} OFF`, color: 'bg-[#4a7c30]' };
			if (promo.type === 'second_discount') return { text: `${promo.value}% off 2nd`, color: 'bg-purple-700' };
			if (promo.type === 'free_delivery') return { text: 'Free Delivery', color: 'bg-blue-700' };
		}
		return null;
	};

	const promotionGroups = {};
	promotions.forEach(promo => {
		const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
		let applicable = applicableProductIds.length === 0
			? allProducts
			: allProducts.filter(p => applicableProductIds.includes(p._id));
		if (applicable.length === 0) return;
		let title = '';
		if (promo.type === 'bogo') title = '🔥 Buy 1 Get 1 Free';
		else if (promo.type === 'percentage') title = `${promo.value}% OFF`;
		else if (promo.type === 'fixed') title = `$${promo.value} OFF`;
		else if (promo.type === 'second_discount') title = `${promo.value}% off your second item`;
		else if (promo.type === 'free_delivery') title = '🚚 Free Delivery';
		else return;
		if (!promotionGroups[title]) promotionGroups[title] = [];
		promotionGroups[title].push(...applicable);
	});
	Object.keys(promotionGroups).forEach(title => {
		promotionGroups[title] = promotionGroups[title].filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
	});

	const MENU_TABS = ['All', 'Milk Tea', 'Fruit Tea', 'Signature', 'Smoothie'];
	const menuTabItems = activeMenuTab === 'All'
		? allProducts
		: allProducts.filter(p => normalizeMenuCategory(p.category) === activeMenuTab);

	const bestSellers = useMemo(() => {
		const priority = { 'Milk Tea': 1, 'Fruit Tea': 2, 'Specialty': 3, 'Smoothie': 4 };
		return [...allProducts].sort((a, b) => {
			const as = priority[a.category] || 99, bs = priority[b.category] || 99;
			if (as !== bs) return as - bs;
			if (!!a.isNewItem !== !!b.isNewItem) return b.isNewItem ? 1 : -1;
			return (b.price || 0) - (a.price || 0);
		}).slice(0, 8);
	}, [allProducts]);

	const handleAddToCart = (productWithModifiers) => {
		addToCart({
			id: productWithModifiers._id,
			name: productWithModifiers.name,
			price: productWithModifiers.finalPrice || productWithModifiers.price,
			imageUrl: productWithModifiers.imageUrl,
			modifiers: productWithModifiers.modifiers,
			quantity: 1,
		});
		setModalProduct(null);
		openCart();
	};

	return (
		<Layout dark>
			{/* Loading bar */}
			{loadingData && (
				<div className="bg-[#e8a33d]/10 border-b border-[#e8a33d]/20 text-[#e8a33d] text-xs text-center py-1">
					Refreshing menu content…
				</div>
			)}

			{/* Sticky Quick Action Bar */}
			{showQuickActionBar && (
				<div className="fixed top-16 left-0 right-0 z-40 bg-[#120a07]/95 backdrop-blur border-b border-white/8 shadow-sm">
					<div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-2 md:gap-3">
						<Link href="/products" className="bg-[#e8a33d] text-[#1a0f0c] px-4 py-2 rounded-full text-sm font-bold hover:bg-amber-400 transition">Order Now</Link>
						<Link href="/build-your-own-fruit-tea" className="border border-[#e8a33d]/50 text-[#e8a33d] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#e8a33d]/10 transition">Build Fruit Tea</Link>
						<Link href="/track-order" className="border border-white/20 text-[#d4b896] px-4 py-2 rounded-full text-sm font-bold hover:bg-white/5 transition">Track Order</Link>
					</div>
				</div>
			)}

			{/* ── Hero ── */}
			<section className="relative bg-[#1a0f0c] overflow-hidden min-h-[480px] flex items-center">
				<div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroData.imageUrl})` }} />
				<div className="absolute inset-0 bg-gradient-to-r from-[#1a0f0c]/90 via-[#1a0f0c]/70 to-[#1a0f0c]/20" />
				<div className="relative max-w-7xl mx-auto px-4 w-full py-20 md:py-28">
					<div className="max-w-2xl">
						<p className="text-[#7ab356] text-xs font-bold uppercase tracking-[2px] mb-4">Zephyrhills, FL · Fresh Daily</p>
						<h1 className="text-5xl md:text-6xl font-extrabold text-[#f5e6c8] leading-tight mb-4">{heroData.title}</h1>
						<p className="text-[#b89070] text-xl mb-8 max-w-xl leading-relaxed">{heroData.subtitle}</p>
						<div className="flex flex-wrap gap-3">
							<Link href="/products" className="bg-[#e8a33d] text-[#1a0f0c] font-extrabold px-8 py-3.5 rounded-full hover:bg-amber-400 transition text-base shadow-lg">
								Order Now
							</Link>
							<Link href="/build-your-own-fruit-tea" className="border-2 border-white/25 text-[#f5e6c8] font-bold px-8 py-3.5 rounded-full hover:bg-white/8 transition text-base">
								Build Fruit Tea
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* ── Quick Entry Cards ── */}
			<section className="bg-[#150d09] py-8">
				<div className="max-w-7xl mx-auto px-4">
					<div className="grid md:grid-cols-3 gap-4">
						{[
							{ href: '/products', eyebrow: 'Fast Pick', title: 'Popular Drinks', desc: 'Order customer favorites in seconds.' },
							{ href: '/build-your-own-fruit-tea', eyebrow: 'Customize', title: 'Build Fruit Tea', desc: 'Choose base, syrups, sugar, and popping boba.' },
							{ href: '/loyalty', eyebrow: 'Rewards', title: 'Earn Points', desc: 'Get points for every order and redeem at checkout.' },
						].map(card => (
							<Link key={card.href} href={card.href}
								className="rounded-2xl bg-[#2a1812] border border-white/8 p-6 hover:border-[#e8a33d]/40 hover:bg-[#33201a] transition group">
								<p className="text-[#e8a33d] text-xs uppercase tracking-wider font-extrabold mb-1 group-hover:text-amber-400">{card.eyebrow}</p>
								<h3 className="text-xl font-extrabold text-[#f5e6c8] mt-1">{card.title}</h3>
								<p className="text-[#b89070] text-sm mt-2 leading-relaxed">{card.desc}</p>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* ── Best Sellers ── */}
			<section className="bg-[#1a0f0c] py-14">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex items-end justify-between gap-4 mb-8">
						<div>
							<p className="text-[#e8a33d] text-xs font-extrabold uppercase tracking-widest mb-1">Top Picks</p>
							<h2 className="text-3xl font-extrabold text-[#f5e6c8]">Best Sellers</h2>
						</div>
						<Link href="/products" className="text-[#e8a33d] text-sm font-semibold hover:text-amber-300 transition">View Full Menu →</Link>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
						{bestSellers.map(product => (
							<DarkProductCard
								key={product._id}
								product={product}
								promo={getProductPromotion(product)}
								isNew={product.isNewItem}
								activeDescriptionId={activeDescriptionProductId}
								onShowDescription={showDescription}
								onAddToCart={setModalProduct}
							/>
						))}
					</div>
				</div>
			</section>

			{/* ── Build Your Tea ── */}
			<section className="bg-[#150d09] py-12">
				<div className="max-w-7xl mx-auto px-4">
					<div className="bg-[#2a1812] border border-white/8 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
						<div>
							<p className="text-[#7ab356] text-xs font-extrabold uppercase tracking-widest mb-2">New Custom Builder</p>
							<h2 className="text-3xl font-extrabold text-[#f5e6c8] mb-3">Build Your Own Fruit Tea</h2>
							<p className="text-[#b89070] max-w-xl leading-relaxed">
								Pick your tea base, choose up to 3 syrup flavors, adjust sugar, and add multiple popping boba flavors.
							</p>
							<p className="text-xs text-[#6b4e37] mt-2">Popping boba only for custom fruit tea. No tapioca pearl.</p>
						</div>
						<div className="flex-shrink-0">
							<Link href="/build-your-own-fruit-tea"
								className="inline-block bg-[#e8a33d] text-[#1a0f0c] font-extrabold px-8 py-3.5 rounded-full hover:bg-amber-400 transition shadow-lg">
								Start Building
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* ── Promotion Sections ── */}
			{Object.entries(promotionGroups).map(([title, products]) => (
				<section key={title} className="bg-[#1a0f0c] py-12 border-t border-white/5">
					<div className="max-w-7xl mx-auto px-4">
						<h2 className="text-2xl font-extrabold text-[#e8a33d] text-center mb-8">{title}</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
							{products.map(product => (
								<DarkProductCard
									key={product._id}
									product={product}
									promo={getProductPromotion(product)}
									isNew={product.isNewItem}
									activeDescriptionId={activeDescriptionProductId}
									onShowDescription={showDescription}
									onAddToCart={setModalProduct}
								/>
							))}
						</div>
					</div>
				</section>
			))}

			{/* ── Menu Section with Tabs ── */}
			<section className="bg-[#150d09] py-12 border-t border-white/5">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex justify-end gap-4 mb-6">
						<Link href="/products" className="border border-[#e8a33d]/40 text-[#e8a33d] px-5 py-2 rounded-full text-sm font-bold hover:bg-[#e8a33d]/10 transition">
							View Full Menu
						</Link>
					</div>

					{/* Category Tabs */}
					<div className="flex gap-2 flex-wrap mb-6">
						{MENU_TABS.map(cat => (
							<button key={cat} onClick={() => setActiveMenuTab(cat)}
								className={`px-4 py-2 rounded-full text-sm font-bold transition border ${
									activeMenuTab === cat
										? 'bg-[#e8a33d] text-[#1a0f0c] border-[#e8a33d]'
										: 'bg-[#2a1812] text-[#b89070] border-white/10 hover:border-[#e8a33d]/30 hover:text-[#f5e6c8]'
								}`}>
								{cat}
							</button>
						))}
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
						{menuTabItems.map(product => (
							<DarkProductCard
								key={product._id}
								product={product}
								promo={getProductPromotion(product)}
								isNew={product.isNewItem}
								activeDescriptionId={activeDescriptionProductId}
								onShowDescription={showDescription}
								onAddToCart={setModalProduct}
							/>
						))}
					</div>
					{menuTabItems.length === 0 && (
						<p className="text-center text-[#6b4e37] py-12">No products available yet.</p>
					)}
				</div>
			</section>

			{/* ── Loyalty / Rewards ── */}
			<section className="bg-[#1a0f0c] py-20 border-t border-white/5">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<div className="inline-flex items-center gap-2 bg-[#e8a33d]/10 text-[#e8a33d] text-sm font-bold px-4 py-1.5 rounded-full mb-4 border border-[#e8a33d]/20">
						⭐ Rewards Program
					</div>
					<h2 className="text-4xl font-extrabold text-[#f5e6c8] mb-4">Earn Rewards with Every Sip</h2>
					<p className="text-[#b89070] mb-12 max-w-2xl mx-auto text-lg">
						Join Bobanest Rewards and earn 1 point for every dollar you spend. Redeem 100 points for $5 off your next order!
					</p>
					<div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
						{[
							{ icon: '🧋', title: 'Order & Earn', desc: 'Earn 1 point for every $1 spent on any order — pickup or delivery.' },
							{ icon: '🎯', title: 'Climb the Tiers', desc: 'Bronze → Silver at 500 pts → Gold at 1,000 pts. Higher tiers unlock exclusive perks.' },
							{ icon: '🎁', title: 'Redeem Rewards', desc: 'Every 100 points = $5 off your next order. Redeem directly at checkout!' },
						].map(item => (
							<div key={item.title} className="bg-[#2a1812] border border-white/8 rounded-2xl p-6">
								<div className="text-4xl mb-3">{item.icon}</div>
								<h3 className="font-extrabold text-[#f5e6c8] text-lg mb-2">{item.title}</h3>
								<p className="text-[#b89070] text-sm leading-relaxed">{item.desc}</p>
							</div>
						))}
					</div>
					<div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
						{[
							{ icon: '🥉', label: 'Bronze', range: '0–499 pts', border: 'border-[#cd7f32]/40' },
							{ icon: '🥈', label: 'Silver', range: '500–999 pts', border: 'border-gray-400/40' },
							{ icon: '🥇', label: 'Gold', range: '1,000+ pts', border: 'border-[#e8a33d]/60' },
						].map(tier => (
							<div key={tier.label} className={`bg-[#2a1812] rounded-xl p-5 border-2 ${tier.border}`}>
								<div className="text-3xl mb-1">{tier.icon}</div>
								<div className="font-extrabold text-[#f5e6c8]">{tier.label}</div>
								<div className="text-xs text-[#6b4e37] mt-1">{tier.range}</div>
							</div>
						))}
					</div>
					<Link href="/loyalty"
						className="bg-[#e8a33d] text-[#1a0f0c] font-extrabold px-8 py-3.5 rounded-full hover:bg-amber-400 transition inline-block">
						Check My Points →
					</Link>
				</div>
			</section>

			{/* ── Social ── */}
			<section className="bg-[#150d09] py-16 border-t border-white/5">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<h2 className="text-3xl font-extrabold text-[#f5e6c8] mb-2">Follow & Connect</h2>
					<p className="text-[#b89070] mb-10">Stay updated with our latest drinks, promotions, and events.</p>
					<div className="flex flex-wrap justify-center gap-8">
						{[
							{ label: 'Instagram', url: 'https://www.instagram.com/bobanest.us/', bg: 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600' },
							{ label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61574360884890', bg: 'bg-[#1877F2]' },
							{ label: 'TikTok', url: 'https://www.tiktok.com/@bobanest.us', bg: 'bg-black border border-white/20' },
							{ label: 'Pinterest', url: 'https://www.pinterest.com/bobanestus/', bg: 'bg-[#E60023]' },
							{ label: 'Yelp', url: 'https://www.yelp.com/biz/bobanest-zephyrhills?osq=Bubble+Tea', bg: 'bg-[#D32323]' },
						].map(s => (
							<a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
								className="group flex flex-col items-center hover:-translate-y-1 transition duration-300">
								<div className={`w-14 h-14 ${s.bg} rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-lg group-hover:shadow-xl group-hover:shadow-[#e8a33d]/10`}>
									{s.label[0]}
								</div>
								<span className="mt-2 text-sm font-semibold text-[#b89070] group-hover:text-[#e8a33d] transition">{s.label}</span>
							</a>
						))}
					</div>
				</div>
			</section>

			{/* ── Testimonials / Google Reviews ── */}
			<section className="bg-[#1a0f0c] py-16 border-t border-white/5">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<div className="inline-flex items-center gap-2 bg-white/5 text-[#b89070] text-xs font-bold px-4 py-1.5 rounded-full mb-4 border border-white/10">
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z" /></svg>
						Google Reviews
					</div>
					<h2 className="text-3xl font-extrabold text-[#f5e6c8] mb-2">What Our Customers Say</h2>
					<div className="flex items-center justify-center gap-2 mb-8">
						<span className="text-[#e8a33d] text-2xl font-extrabold">4.9</span>
						<span className="text-[#e8a33d] text-xl">★★★★★</span>
						<span className="text-[#6b4e37] text-sm">(Google reviews)</span>
					</div>
					<div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
						{STATIC_GOOGLE_REVIEWS.slice(0, 6).map((r, idx) => (
							<div key={idx} className="bg-[#2a1812] border border-white/8 rounded-2xl p-5 text-left flex flex-col gap-2 hover:border-white/15 transition">
								<div className="flex items-center gap-3">
									{r.profile_photo_url ? (
										<img src={r.profile_photo_url} alt={r.author_name} className="w-9 h-9 rounded-full object-cover" />
									) : (
										<div className="w-9 h-9 rounded-full bg-[#e8a33d] flex items-center justify-center text-[#1a0f0c] font-extrabold text-sm flex-shrink-0">
											{(r.author_name || 'A')[0].toUpperCase()}
										</div>
									)}
									<div>
										<p className="text-[#f5e6c8] font-bold text-sm leading-tight">{r.author_name}</p>
										<p className="text-[#6b4e37] text-xs">{r.relative_time_description}</p>
									</div>
									<div className="ml-auto flex-shrink-0">
										<svg className="w-4 h-4 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
									</div>
								</div>
								<div className="flex text-[#e8a33d] text-sm">
									{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
								</div>
								<p className="text-[#b89070] text-sm leading-relaxed line-clamp-4">{r.text}</p>
							</div>
						))}
					</div>
					<div className="mt-10">
						<a href="https://g.co/kgs/bobanest" target="_blank" rel="noopener noreferrer"
							className="inline-flex items-center gap-2 border border-white/15 text-[#b89070] px-6 py-3 rounded-full text-sm font-semibold hover:border-[#e8a33d]/40 hover:text-[#e8a33d] transition">
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
							See all Google reviews
						</a>
					</div>
				</div>
			</section>

			{/* ── Our Story ── */}
			<section className="bg-[#150d09] py-20 border-t border-white/5">
				<div className="max-w-7xl mx-auto px-4">
					<div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
						<div>
							<p className="text-[#e8a33d] text-xs font-extrabold uppercase tracking-widest mb-3">Our Story</p>
							<h2 className="text-4xl font-extrabold text-[#f5e6c8] leading-tight mb-6">
								Born from a Love of Real Tea
							</h2>
							<p className="text-[#b89070] leading-relaxed mb-4">
								Bobanest started with one simple belief — bubble tea should be made with real ingredients, real fruit, and real care. We got tired of overly sweet, artificial drinks and wanted to bring something different to Zephyrhills.
							</p>
							<p className="text-[#b89070] leading-relaxed mb-4">
								Every drink we make is handcrafted to order. We source quality teas, prepare our syrups fresh, and let you customize exactly how you like it. Whether you want a classic taro milk tea or you are building your own fruit tea from scratch — we have got you.
							</p>
							<p className="text-[#b89070] leading-relaxed mb-8">
								We are proud to be part of the Zephyrhills community and look forward to serving you for years to come. Come in, say hi, and let us make you something amazing. 🧋
							</p>
							<div className="flex flex-wrap gap-4">
								<Link href="/products" className="bg-[#e8a33d] text-[#1a0f0c] font-extrabold px-6 py-3 rounded-full hover:bg-amber-400 transition text-sm">
									Browse Our Menu
								</Link>
								<Link href="/contact" className="border border-white/20 text-[#d4b896] font-semibold px-6 py-3 rounded-full hover:bg-white/5 transition text-sm">
									Visit Us
								</Link>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							{[
								{ icon: '🌿', label: 'Real Ingredients', desc: 'No artificial flavors or shortcuts' },
								{ icon: '🍵', label: 'Handcrafted', desc: 'Every drink made fresh to order' },
								{ icon: '📍', label: 'Local & Proud', desc: 'Zephyrhills, FL community roots' },
								{ icon: '❤️', label: 'Customer First', desc: 'Your satisfaction is everything' },
							].map(item => (
								<div key={item.label} className="bg-[#2a1812] border border-white/8 rounded-2xl p-5 hover:border-[#e8a33d]/25 transition">
									<div className="text-3xl mb-3">{item.icon}</div>
									<p className="text-[#f5e6c8] font-bold text-sm">{item.label}</p>
									<p className="text-[#6b4e37] text-xs mt-1 leading-relaxed">{item.desc}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ── Catering CTA ── */}
			<section className="relative bg-[#e8a33d] py-16 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-[#e8a33d] to-[#c47a20] opacity-80" />
				<div className="relative max-w-7xl mx-auto px-4 text-center">
					<h2 className="text-3xl font-extrabold text-[#1a0f0c] mb-3">Catering for Events</h2>
					<p className="text-[#1a0f0c]/70 text-lg mb-8 max-w-xl mx-auto">
						Make your next event special with Bobanest&apos;s catering service. From corporate events to birthday parties.
					</p>
					<Link href="/catering"
						className="bg-[#1a0f0c] text-[#e8a33d] font-extrabold px-8 py-3.5 rounded-full hover:bg-[#2d1a14] transition inline-block shadow-lg">
						Request Catering
					</Link>
				</div>
			</section>

			{/* ── Newsletter ── */}
			<NewsletterSection />

			{/* ── Product Modal ── */}
			{modalProduct && (
				<ProductModal
					product={modalProduct}
					modifierGroups={modifierGroups}
					onClose={() => setModalProduct(null)}
					onAddToCart={handleAddToCart}
				/>
			)}
		</Layout>
	);
}