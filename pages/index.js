
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/components/CartContext';
import ProductModal from '@/components/ProductModal';

const DESCRIPTION_VISIBLE_MS = 4000;

function NewsletterSection() {
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [status, setStatus] = useState(''); // '' | 'loading' | 'success' | 'error'
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
		<section className="py-16 bg-gradient-to-r from-primary/10 to-secondary/10">
			<div className="max-w-2xl mx-auto px-4 text-center">
				<div className="text-4xl mb-3">📬</div>
				<h2 className="text-3xl font-bold mb-2">Stay in the Loop</h2>
				<p className="text-gray-600 mb-8">Get exclusive deals, new flavors, and event updates delivered straight to your inbox. No spam, ever.</p>
				{status === 'success' ? (
					<div className="bg-green-50 border border-green-300 text-green-700 rounded-xl py-6 px-8">
						<div className="text-3xl mb-2">🎉</div>
						<p className="font-bold text-lg">You&apos;re subscribed!</p>
						<p className="text-sm mt-1">Welcome to the Bobanest family. Keep an eye on your inbox for exclusive deals.</p>
					</div>
				) : (
					<form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
						<input
							type="text"
							placeholder="Your name (optional)"
							value={name}
							onChange={e => setName(e.target.value)}
							className="flex-1 border p-3 rounded-lg text-sm"
						/>
						<input
							type="email"
							placeholder="your@email.com"
							value={email}
							onChange={e => setEmail(e.target.value)}
							className="flex-1 border p-3 rounded-lg text-sm"
							required
						/>
						<button
							type="submit"
							disabled={status === 'loading'}
							className="btn-primary whitespace-nowrap disabled:opacity-50"
						>
							{status === 'loading' ? 'Subscribing...' : 'Subscribe'}
						</button>
					</form>
				)}
				{status === 'error' && <p className="text-red-500 text-sm mt-3">Something went wrong. Please try again.</p>}
			</div>
		</section>
	);
}

export default function Home() {
	const [heroData, setHeroData] = useState({
		imageUrl: '/hero-default.jpg',
		title: 'Fresh Bubble Tea Delivered to You',
		subtitle: 'Handcrafted with premium ingredients. Order online for pickup or delivery.',
	});
	const [allProducts, setAllProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [promotions, setPromotions] = useState([]);
	const [modalProduct, setModalProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const { addToCart } = useCart();
	const [showQuickActionBar, setShowQuickActionBar] = useState(false);
	const [activeDescriptionProductId, setActiveDescriptionProductId] = useState(null);
	const descriptionTimeoutRef = useRef(null);

	const showDescription = (productId) => {
		setActiveDescriptionProductId(productId);
		if (descriptionTimeoutRef.current) {
			clearTimeout(descriptionTimeoutRef.current);
		}
		descriptionTimeoutRef.current = setTimeout(() => {
			setActiveDescriptionProductId(null);
			descriptionTimeoutRef.current = null;
		}, DESCRIPTION_VISIBLE_MS);
	};

	// Fetch all data in parallel (no race condition)
	useEffect(() => {
		Promise.all([
			fetch('/api/admin/hero').then(res => res.json()).catch(() => ({})),
			fetch('/api/admin/products').then(res => res.json()).catch(() => []),
			fetch('/api/admin/promotions?active=true').then(res => res.json()).catch(() => [])
		]).then(([hero, products, promos]) => {
			setHeroData(hero);
			setAllProducts(products);
			setPromotions(promos);
			const uniqueCategories = [...new Set(products.map(p => p.category))];
			setCategories(uniqueCategories);
			setLoading(false);
		});
	}, []);

	// Helper: get promotion badge for a product
	const getProductPromotion = (product) => {
		for (const promo of promotions) {
			const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
			const applies = applicableProductIds.length === 0 || applicableProductIds.includes(product._id);
			if (!applies) continue;
			if (promo.type === 'bogo') return { text: 'Buy 1 Get 1 Free', color: 'bg-red-500' };
			if (promo.type === 'percentage') return { text: `${promo.value}% OFF`, color: 'bg-orange-500' };
			if (promo.type === 'fixed') return { text: `$${promo.value} OFF`, color: 'bg-green-500' };
			if (promo.type === 'second_discount') return { text: `${promo.value}% off 2nd`, color: 'bg-purple-500' };
			if (promo.type === 'free_delivery') return { text: 'Free Delivery', color: 'bg-blue-500' };
		}
		return null;
	};

	// Group promotions into sections for the homepage
	const promotionGroups = {};
	promotions.forEach(promo => {
		const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
		let applicableProducts = applicableProductIds.length === 0
			? allProducts
			: allProducts.filter(p => applicableProductIds.includes(p._id));
		if (applicableProducts.length === 0) return;
		let title = '';
		if (promo.type === 'bogo') title = '🔥 Buy 1 Get 1 Free';
		else if (promo.type === 'percentage') title = `${promo.value}% OFF`;
		else if (promo.type === 'fixed') title = `$${promo.value} OFF`;
		else if (promo.type === 'second_discount') title = `${promo.value}% off your second item`;
		else if (promo.type === 'free_delivery') title = '🚚 Free Delivery';
		else return;
		if (!promotionGroups[title]) promotionGroups[title] = [];
		promotionGroups[title].push(...applicableProducts);
	});
	// Remove duplicate products in each group
	Object.keys(promotionGroups).forEach(title => {
		promotionGroups[title] = promotionGroups[title].filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
	});

	// Show a fixed quick action bar after the user scrolls past the hero area.
	useEffect(() => {
		const handleScroll = () => {
			setShowQuickActionBar(window.scrollY > 240);
		};
		window.addEventListener('scroll', handleScroll);
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => () => {
		if (descriptionTimeoutRef.current) {
			clearTimeout(descriptionTimeoutRef.current);
		}
	}, []);

	const groupedProducts = categories.map(cat => ({
		category: cat,
		items: allProducts.filter(p => p.category === cat),
	}));

	const bestSellers = useMemo(() => {
		const categoryPriority = {
			'Milk Tea': 1,
			'Fruit Tea': 2,
			'Specialty': 3,
			'Smoothie': 4,
		};
		return [...allProducts]
			.sort((a, b) => {
				const aScore = categoryPriority[a.category] || 99;
				const bScore = categoryPriority[b.category] || 99;
				if (aScore !== bScore) return aScore - bScore;
				if (!!a.isNewItem !== !!b.isNewItem) return b.isNewItem ? 1 : -1;
				return (b.price || 0) - (a.price || 0);
			})
			.slice(0, 8);
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
	};

	if (loading) {
		return (
			<Layout>
				<div className="flex justify-center items-center h-screen">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			{showQuickActionBar && (
				<div className="fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-orange-100 shadow-sm">
					<div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-2 md:gap-3">
						<Link href="/products" className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold">Order Now</Link>
						<Link href="/build-your-own-fruit-tea" className="bg-secondary text-white px-4 py-2 rounded-full text-sm font-semibold">Build Fruit Tea</Link>
						<Link href="/track-order" className="bg-dark text-white px-4 py-2 rounded-full text-sm font-semibold">Track Order</Link>
					</div>
				</div>
			)}

			{/* Hero Section */}
			<div className="relative bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: `url(${heroData.imageUrl})` }}>
				<div className="absolute inset-0 bg-black/40"></div>
				<div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 text-center text-white z-10">
					<h1 className="text-5xl md:text-6xl font-bold mb-4">{heroData.title}</h1>
					<p className="text-xl mb-8 max-w-2xl mx-auto">{heroData.subtitle}</p>
					<div className="flex flex-wrap gap-4 justify-center">
						<Link href="/products" className="btn-primary bg-white text-dark hover:bg-gray-100">Order Now</Link>
						<Link href="/build-your-own-fruit-tea" className="btn-outline border-white text-white hover:bg-white hover:text-dark">Build Fruit Tea</Link>
					</div>
				</div>
			</div>

			{/* Quick Entry Cards */}
			<section className="py-8 bg-white">
				<div className="max-w-7xl mx-auto px-4">
					<div className="grid md:grid-cols-3 gap-4">
						<Link href="/products" className="rounded-2xl border border-orange-100 bg-gradient-to-br from-amber-50 to-orange-100 p-6 hover:shadow-md transition">
							<p className="text-xs uppercase tracking-wider font-semibold text-secondary">Fast Pick</p>
							<h3 className="text-2xl font-bold text-dark mt-1">Popular Drinks</h3>
							<p className="text-sm text-gray-600 mt-2">Order customer favorites in seconds.</p>
						</Link>
						<Link href="/build-your-own-fruit-tea" className="rounded-2xl border border-orange-100 bg-gradient-to-br from-rose-50 to-orange-100 p-6 hover:shadow-md transition">
							<p className="text-xs uppercase tracking-wider font-semibold text-secondary">Customize</p>
							<h3 className="text-2xl font-bold text-dark mt-1">Build Fruit Tea</h3>
							<p className="text-sm text-gray-600 mt-2">Choose base, syrups, sugar, and popping boba.</p>
						</Link>
						<Link href="/loyalty" className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-yellow-100 p-6 hover:shadow-md transition">
							<p className="text-xs uppercase tracking-wider font-semibold text-secondary">Rewards</p>
							<h3 className="text-2xl font-bold text-dark mt-1">Earn Points</h3>
							<p className="text-sm text-gray-600 mt-2">Get points for every order and redeem at checkout.</p>
						</Link>
					</div>
				</div>
			</section>

			{/* Best Sellers */}
			<section className="py-12 bg-gradient-to-r from-orange-50 to-amber-50">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex items-center justify-between gap-4 mb-6">
						<div>
							<p className="text-xs uppercase tracking-wider text-secondary font-semibold">Top Picks</p>
							<h2 className="text-3xl font-bold">Best Sellers</h2>
						</div>
						<Link href="/products" className="text-sm font-semibold text-primary hover:text-secondary">View Full Menu</Link>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
						{bestSellers.map(product => {
							const promo = getProductPromotion(product);
							return (
								<div key={product._id} className="product-card bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition relative">
									{promo && (
										<div className={`absolute top-2 left-2 ${promo.color} text-white text-xs font-bold px-2 py-1 rounded-full z-10`}>
											{promo.text}
										</div>
									)}
									{product.isNewItem && (
										<div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
											NEW
										</div>
									)}
									<div className="cup-container h-32 flex items-center justify-center">
										<img
											src={product.imageUrl}
											alt={product.name}
											className="product-cup-image max-h-full max-w-full object-contain cursor-pointer"
											onClick={() => showDescription(product._id)}
											onTouchStart={() => showDescription(product._id)}
										/>
									</div>
									<h3 className="font-bold mt-2">{product.name}</h3>
									{activeDescriptionProductId === product._id && (
										<p className="text-xs text-gray-600 mt-1 min-h-[2.5rem]">{product.description}</p>
									)}
									<p className="text-primary font-bold mt-1">${product.price}</p>
									<button
										onClick={() => setModalProduct(product)}
										className="mt-3 bg-secondary text-white px-4 py-1 rounded-full text-sm hover:bg-primary transition"
									>
										Add to Cart
									</button>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Build Your Own Feature */}
			<section className="py-10 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50">
				<div className="max-w-7xl mx-auto px-4">
					<div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
						<div>
							<p className="text-xs uppercase tracking-widest text-secondary font-bold">New Custom Builder</p>
							<h2 className="text-3xl font-extrabold text-dark mt-1">Build Your Own Fruit Tea</h2>
							<p className="text-gray-600 mt-2 max-w-2xl">
								Pick your tea base, choose up to 3 syrup flavors, adjust sugar, and add multiple popping boba flavors.
							</p>
							<p className="text-sm text-gray-500 mt-1">Popping boba only for custom fruit tea. No tapioca pearl.</p>
						</div>
						<div className="flex-shrink-0">
							<Link href="/build-your-own-fruit-tea" className="btn-primary inline-block">
								Start Building
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Promotion Sections (dynamic backgrounds) */}
			{Object.entries(promotionGroups).map(([title, products], idx) => {
				const bgColors = [
					'bg-gradient-to-r from-yellow-50 to-orange-50',
					'bg-gradient-to-r from-pink-50 to-red-50',
					'bg-gradient-to-r from-green-50 to-teal-50',
					'bg-gradient-to-r from-blue-50 to-indigo-50',
					'bg-gradient-to-r from-purple-50 to-pink-50',
				];
				const bgClass = bgColors[idx % bgColors.length];
				return (
					<section key={title} className={`py-12 ${bgClass}`}>
						<div className="max-w-7xl mx-auto px-4">
							<h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
								{products.map(product => {
									const promo = getProductPromotion(product);
									return (
										<div key={product._id} className="product-card bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition relative">
											{promo && (
												<div className={`absolute top-2 left-2 ${promo.color} text-white text-xs font-bold px-2 py-1 rounded-full z-10`}>
													{promo.text}
												</div>
											)}
											{product.isNewItem && (
												<div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
													NEW
												</div>
											)}
											<div className="cup-container h-32 flex items-center justify-center">
												<img
													src={product.imageUrl}
													alt={product.name}
													className="product-cup-image max-h-full max-w-full object-contain cursor-pointer"
													onClick={() => showDescription(product._id)}
													onTouchStart={() => showDescription(product._id)}
												/>
											</div>
											<h3 className="font-bold mt-2">{product.name}</h3>
											{activeDescriptionProductId === product._id && (
												<p className="text-xs text-gray-600 mt-1 min-h-[2.5rem]">{product.description}</p>
											)}
											<p className="text-primary font-bold mt-1">${product.price}</p>
											<button
												onClick={() => setModalProduct(product)}
												className="mt-3 bg-secondary text-white px-4 py-1 rounded-full text-sm hover:bg-primary transition"
											>
												Add to Cart
											</button>
										</div>
									);
								})}
							</div>
						</div>
					</section>
				);
			})}

			{/* Menu Highlights */}
			<section className="max-w-7xl mx-auto px-4 py-10">
				<div className="flex items-center justify-between gap-4 mb-6">
					<div>
						<p className="text-xs uppercase tracking-wider text-secondary font-semibold">Browse</p>
						<h2 className="text-3xl font-bold">Menu Highlights</h2>
					</div>
					<Link href="/products" className="btn-outline">View Full Menu</Link>
				</div>

				{groupedProducts.map(({ category, items }) => (
					<div key={category} className="mb-12">
						<h2 className="text-2xl font-bold mb-6">{category}</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
							{items.slice(0, 3).map(product => {
								const promo = getProductPromotion(product);
								return (
									<div key={product._id} className="product-card bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition relative">
										{promo && (
											<div className={`absolute top-2 left-2 ${promo.color} text-white text-xs font-bold px-2 py-1 rounded-full z-10`}>
												{promo.text}
											</div>
									)}
									{product.isNewItem && (
										<div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
											NEW
										</div>
									)}
									<div className="cup-container h-32 flex items-center justify-center">
											<img
												src={product.imageUrl}
												alt={product.name}
												className="product-cup-image max-h-full max-w-full object-contain cursor-pointer"
												onClick={() => showDescription(product._id)}
												onTouchStart={() => showDescription(product._id)}
											/>
										</div>
										<h3 className="font-bold mt-2">{product.name}</h3>
										{activeDescriptionProductId === product._id && (
											<p className="text-xs text-gray-600 mt-1 min-h-[2.5rem]">{product.description}</p>
										)}
										<p className="text-primary font-bold mt-1">${product.price}</p>
										<button
											onClick={() => setModalProduct(product)}
											className="mt-3 bg-secondary text-white px-4 py-1 rounded-full text-sm hover:bg-primary transition"
										>
											Add to Cart
										</button>
									</div>
								);
							})}
						</div>
					</div>
				))}
				{allProducts.length === 0 && <p className="text-center text-gray-500 py-12">No products available yet.</p>}
			</section>

			{/* Loyalty Rewards Section */}
			<section className="py-20 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<div className="mb-4 inline-flex items-center gap-2 bg-pink-100 text-pink-700 text-sm font-semibold px-4 py-1.5 rounded-full">
						⭐ Rewards Program
					</div>
					<h2 className="text-4xl font-bold mb-4">Earn Rewards with Every Sip</h2>
					<p className="text-gray-600 mb-12 max-w-2xl mx-auto text-lg">
						Join Bobanest Rewards and earn 1 point for every dollar you spend. Redeem 100 points for $5 off your next order!
					</p>

					{/* How it works */}
					<div className="grid md:grid-cols-3 gap-8 mb-12">
						<div className="bg-white rounded-2xl p-6 shadow-md">
							<div className="text-5xl mb-3">🧋</div>
							<h3 className="font-bold text-lg mb-2">Order &amp; Earn</h3>
							<p className="text-gray-500 text-sm">Earn 1 point for every $1 spent on any order — pickup or delivery.</p>
						</div>
						<div className="bg-white rounded-2xl p-6 shadow-md">
							<div className="text-5xl mb-3">🎯</div>
							<h3 className="font-bold text-lg mb-2">Climb the Tiers</h3>
							<p className="text-gray-500 text-sm">Bronze → Silver at 500 pts → Gold at 1,000 pts. Higher tiers unlock exclusive perks.</p>
						</div>
						<div className="bg-white rounded-2xl p-6 shadow-md">
							<div className="text-5xl mb-3">🎁</div>
							<h3 className="font-bold text-lg mb-2">Redeem Rewards</h3>
							<p className="text-gray-500 text-sm">Every 100 points = $5 off your next order. Redeem directly at checkout!</p>
						</div>
					</div>

					{/* Tiers */}
					<div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-12">
						<div className="bg-white rounded-xl p-5 shadow border-2 border-orange-200">
							<div className="text-3xl mb-1">🥉</div>
							<div className="font-bold text-orange-400">Bronze</div>
							<div className="text-xs text-gray-400 mt-1">0–499 pts</div>
						</div>
						<div className="bg-white rounded-xl p-5 shadow border-2 border-gray-300">
							<div className="text-3xl mb-1">🥈</div>
							<div className="font-bold text-gray-500">Silver</div>
							<div className="text-xs text-gray-400 mt-1">500–999 pts</div>
						</div>
						<div className="bg-white rounded-xl p-5 shadow border-2 border-yellow-300">
							<div className="text-3xl mb-1">🥇</div>
							<div className="font-bold text-yellow-500">Gold</div>
							<div className="text-xs text-gray-400 mt-1">1,000+ pts</div>
						</div>
					</div>

					<Link href="/loyalty" className="inline-block bg-primary text-white px-8 py-3 rounded-full font-bold text-lg hover:opacity-90 transition shadow-lg">
						Check My Points →
					</Link>
				</div>
			</section>

			{/* Social Media Follow Section */}
			<section className="py-16 bg-gradient-to-r from-pink-50 to-purple-50">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-4">Follow & Connect</h2>
					<p className="text-gray-600 mb-12 max-w-2xl mx-auto">
						Stay updated with our latest drinks, promotions, and events. Join our bubble tea community!
					</p>
					<div className="flex flex-wrap justify-center gap-6 md:gap-8">
						{/* Instagram */}
						<a href="https://www.instagram.com/bobanest.us/" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center transform hover:-translate-y-1 transition duration-300">
							<div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl">
								<svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg>
							</div>
							<span className="mt-2 font-semibold text-gray-700">Instagram</span>
						</a>
						{/* Facebook */}
						<a href="https://www.facebook.com/profile.php?id=61574360884890" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center transform hover:-translate-y-1 transition duration-300">
							<div className="w-16 h-16 bg-[#1877F2] rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl">
								<svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
							</div>
							<span className="mt-2 font-semibold text-gray-700">Facebook</span>
						</a>
						{/* TikTok */}
						<a href="https://www.tiktok.com/@bobanest.us" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center transform hover:-translate-y-1 transition duration-300">
							<div className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl">
								<svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v3.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.76-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
							</div>
							<span className="mt-2 font-semibold text-gray-700">TikTok</span>
						</a>
						{/* Pinterest */}
						<a href="https://www.pinterest.com/bobanestus/" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center transform hover:-translate-y-1 transition duration-300">
							<div className="w-16 h-16 bg-[#E60023] rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl">
								<svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.4.163-1.5-.698-2.436-2.889-2.436-4.649 0-3.785 2.749-7.265 7.938-7.265 4.167 0 7.404 2.967 7.404 6.931 0 4.136-2.607 7.464-6.227 7.464-1.212 0-2.354-.629-2.744-1.373l-.747 2.845c-.27 1.041-1.002 2.344-1.499 3.14 1.131.35 2.322.537 3.554.537 6.607 0 11.985-5.365 11.985-11.987C23.997 5.365 18.625 0 12.017 0z"/></svg>
							</div>
							<span className="mt-2 font-semibold text-gray-700">Pinterest</span>
						</a>
						{/* Yelp */}
						<a href="https://www.yelp.com/biz/bobanest-zephyrhills?osq=Bubble+Tea" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center transform hover:-translate-y-1 transition duration-300">
							<div className="w-16 h-16 bg-[#D32323] rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl">
								<svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2zm-1.5 4.5v3.5h-3.5c-1.104 0-2 .896-2 2s.896 2 2 2h3.5v3.5c0 1.104.896 2 2 2s2-.896 2-2v-3.5h3.5c1.104 0 2-.896 2-2s-.896-2-2-2h-3.5v-3.5c0-1.104-.896-2-2-2s-2 .896-2 2z"/></svg>
							</div>
							<span className="mt-2 font-semibold text-gray-700">Yelp</span>
						</a>
					</div>
				</div>
			</section>

			{/* Testimonials */}
			<section className="py-16 bg-white">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-8">What Our Customers Say</h2>
					<div className="grid md:grid-cols-3 gap-8">
						<div className="p-6 bg-gray-50 rounded-lg shadow">⭐️⭐️⭐️⭐️⭐️<br/>"Best bubble tea in town!"<br/>- Sarah</div>
						<div className="p-6 bg-gray-50 rounded-lg shadow">⭐️⭐️⭐️⭐️⭐️<br/>"Fast delivery, great flavors."<br/>- Mike</div>
						<div className="p-6 bg-gray-50 rounded-lg shadow">⭐️⭐️⭐️⭐️⭐️<br/>"We order every week."<br/>- Jessica</div>
					</div>
					<div className="mt-8">
						<Link href="/products" className="btn-primary">Order Now</Link>
					</div>
				</div>
			</section>

			{/* Catering CTA */}
			<section className="py-16 bg-dark text-white">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-4">Catering for Events</h2>
					<p className="text-xl mb-8">Make your next event special with Bobanest's catering service.</p>
					<Link href="/catering" className="btn-primary bg-white text-dark hover:bg-gray-100">Request Catering</Link>
				</div>
			</section>

			{/* Newsletter Signup */}
		<NewsletterSection />

		{/* Modifier Modal */}
			{modalProduct && (
				<ProductModal
					product={modalProduct}
					onClose={() => setModalProduct(null)}
					onAddToCart={handleAddToCart}
				/>
			)}
		</Layout>
	);
}