import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useCart } from '@/components/CartContext';

const SYRUPS = [
  'Mango',
  'Lemon',
  'Pineapple',
  'Passion Fruit',
  'Green Apple',
  'Honeydew',
  'Strawberry',
  'Peach',
  'Lychee',
];

const POPPING_BOBA = [
  'Mango',
  'Strawberry',
  'Passion Fruit',
  'Lychee',
  'Blueberry',
];

const TEA_BASES = ['Jasmine Green Tea', 'Earl Grey Black Tea'];

const SIZE_OPTIONS = {
  '16 oz': {
    label: '16 oz',
    syrupMl: 40,
    maxSugarMl: 20,
    basePrice: 5.99,
  },
  '22 oz': {
    label: '22 oz',
    syrupMl: 60,
    maxSugarMl: 30,
    basePrice: 6.99,
  },
};

const STEPS = [
  'Choose Size',
  'Choose Tea Base',
  'Choose Syrups',
  'Adjust Cane Sugar',
  'Add Popping Boba',
  'Review & Add to Cart',
];

const DEFAULT_SIZE_PRICES = {
  '16 oz': 5.99,
  '22 oz': 6.99,
};

const PRICE_NAME_MATCHERS = {
  '16 oz': ['build your own fruit tea 16 oz', 'custom fruit tea 16 oz'],
  '22 oz': ['build your own fruit tea 22 oz', 'custom fruit tea 22 oz'],
};

function formatSplit(choices, totalMl) {
  if (choices.length === 0) return [];
  const base = Math.floor(totalMl / choices.length);
  const remainder = totalMl % choices.length;
  return choices.map((name, idx) => `${name} (${base + (idx < remainder ? 1 : 0)} ml)`);
}

export default function BuildYourOwnFruitTeaPage() {
  const { addToCart } = useCart();

  const [step, setStep] = useState(0);
  const [size, setSize] = useState('16 oz');
  const [teaBase, setTeaBase] = useState(TEA_BASES[0]);
  const [selectedSyrups, setSelectedSyrups] = useState([]);
  const [caneSugarMl, setCaneSugarMl] = useState(SIZE_OPTIONS['16 oz'].maxSugarMl);
  const [selectedPoppingBoba, setSelectedPoppingBoba] = useState([]);
  const [addedMessage, setAddedMessage] = useState('');
  const [sizePrices, setSizePrices] = useState(DEFAULT_SIZE_PRICES);

  useEffect(() => {
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((products) => {
        if (!Array.isArray(products)) return;

        const findPrice = (sizeLabel) => {
          const matchers = PRICE_NAME_MATCHERS[sizeLabel] || [];
          const matched = products.find((p) => {
            const name = (p?.name || '').toLowerCase().trim();
            return matchers.some((m) => name === m || name.includes(m));
          });
          if (matched && typeof matched.price === 'number') {
            return matched.price;
          }
          return DEFAULT_SIZE_PRICES[sizeLabel];
        };

        setSizePrices({
          '16 oz': findPrice('16 oz'),
          '22 oz': findPrice('22 oz'),
        });
      })
      .catch(() => {
        setSizePrices(DEFAULT_SIZE_PRICES);
      });
  }, []);

  const selectedSizeConfig = SIZE_OPTIONS[size];

  const syrupSplit = useMemo(
    () => formatSplit(selectedSyrups, selectedSizeConfig.syrupMl),
    [selectedSyrups, selectedSizeConfig.syrupMl]
  );

  const canGoNext = useMemo(() => {
    if (step === 2) return selectedSyrups.length > 0;
    return true;
  }, [step, selectedSyrups.length]);

  const goNext = () => {
    if (!canGoNext) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSizeChange = (nextSize) => {
    setSize(nextSize);
    const nextSugarMax = SIZE_OPTIONS[nextSize].maxSugarMl;
    setCaneSugarMl((prev) => Math.min(prev, nextSugarMax));
  };

  const toggleSyrup = (syrup) => {
    setSelectedSyrups((prev) => {
      if (prev.includes(syrup)) {
        return prev.filter((name) => name !== syrup);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, syrup];
    });
  };

  const togglePoppingBoba = (boba) => {
    setSelectedPoppingBoba((prev) => {
      if (prev.includes(boba)) {
        return prev.filter((name) => name !== boba);
      }
      return [...prev, boba];
    });
  };

  const handleAddToCart = () => {
    if (selectedSyrups.length === 0) return;

    const modifiers = [
      { name: 'Drink Type', options: ['Custom Fruit Tea'] },
      { name: 'Size', options: [size] },
      { name: 'Tea Base', options: [teaBase] },
      { name: 'Syrups', options: syrupSplit },
      { name: 'Cane Sugar', options: [`${caneSugarMl} ml`] },
      {
        name: 'Popping Boba',
        options: selectedPoppingBoba.length > 0 ? selectedPoppingBoba : ['None'],
      },
    ];

    addToCart({
      id: 'custom-fruit-tea',
      name: `Build Your Own Fruit Tea (${size})`,
      price: sizePrices[size],
      imageUrl: '/favicon.ico',
      modifiers,
      quantity: 1,
    });

    setAddedMessage('Custom fruit tea added to cart.');
  };

  return (
    <Layout title="Build Your Own Fruit Tea - Bobanest">
      <section className="bg-gradient-to-b from-orange-50 via-amber-50 to-white py-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-6">
              <p className="text-sm uppercase tracking-wider font-semibold">Step by Step Builder</p>
              <h1 className="text-3xl md:text-4xl font-extrabold mt-1">Build Your Own Fruit Tea</h1>
              <p className="text-sm md:text-base mt-2 text-orange-50">
                Popping boba only for custom fruit tea. No tapioca pearl in this builder.
              </p>
            </div>

            <div className="px-6 pt-6">
              <div className="w-full bg-orange-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-secondary transition-all"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <p className="text-sm text-dark mt-2 font-medium">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
              </p>
            </div>

            <div className="px-6 py-6 space-y-5">
              {step === 0 && (
                <div>
                  <h2 className="text-xl font-bold text-dark mb-3">Choose your size</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {Object.values(SIZE_OPTIONS).map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleSizeChange(option.label)}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          size === option.label
                            ? 'border-secondary bg-orange-50 ring-2 ring-orange-200'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <p className="font-bold text-lg">{option.label}</p>
                        <p className="text-sm text-gray-600">Syrup: {option.syrupMl} ml total</p>
                        <p className="text-sm text-gray-600">Cane sugar max: {option.maxSugarMl} ml</p>
                        <p className="text-sm font-semibold text-primary mt-1">${sizePrices[option.label].toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-dark mb-3">Choose tea base</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {TEA_BASES.map((base) => (
                      <button
                        key={base}
                        type="button"
                        onClick={() => setTeaBase(base)}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          teaBase === base
                            ? 'border-secondary bg-orange-50 ring-2 ring-orange-200'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <p className="font-semibold">{base}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-dark mb-1">Choose syrup flavors</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Pick up to 3 flavors. Total syrup is fixed at {selectedSizeConfig.syrupMl} ml.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SYRUPS.map((syrup) => {
                      const selected = selectedSyrups.includes(syrup);
                      const disabled = !selected && selectedSyrups.length >= 3;
                      return (
                        <button
                          key={syrup}
                          type="button"
                          onClick={() => toggleSyrup(syrup)}
                          disabled={disabled}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            selected
                              ? 'bg-secondary text-white border-secondary'
                              : 'bg-white border-gray-200 hover:border-orange-300 disabled:opacity-40'
                          }`}
                        >
                          {syrup}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 p-3">
                    <p className="font-semibold text-dark">Syrup split</p>
                    {syrupSplit.length === 0 ? (
                      <p className="text-sm text-gray-600 mt-1">Select at least 1 syrup to continue.</p>
                    ) : (
                      <ul className="text-sm text-gray-700 mt-1 list-disc pl-5">
                        {syrupSplit.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-dark mb-1">Adjust cane sugar</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    You can reduce sugar, but cannot increase above {selectedSizeConfig.maxSugarMl} ml.
                  </p>

                  <input
                    type="range"
                    min={0}
                    max={selectedSizeConfig.maxSugarMl}
                    value={caneSugarMl}
                    onChange={(e) => setCaneSugarMl(Number(e.target.value))}
                    className="w-full accent-secondary"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>0 ml</span>
                    <span className="font-bold text-primary">Selected: {caneSugarMl} ml</span>
                    <span>{selectedSizeConfig.maxSugarMl} ml max</span>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="text-xl font-bold text-dark mb-1">Add popping boba</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Select one or more popping boba flavors. Tapioca pearl is excluded for custom fruit tea.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POPPING_BOBA.map((boba) => {
                      const selected = selectedPoppingBoba.includes(boba);
                      return (
                        <button
                          key={boba}
                          type="button"
                          onClick={() => togglePoppingBoba(boba)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            selected
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {boba}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 className="text-xl font-bold text-dark mb-3">Review your custom drink</h2>

                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-2 text-sm">
                    <p><span className="font-semibold">Drink:</span> Build Your Own Fruit Tea</p>
                    <p><span className="font-semibold">Size:</span> {size}</p>
                    <p><span className="font-semibold">Tea Base:</span> {teaBase}</p>
                    <p><span className="font-semibold">Syrups:</span> {syrupSplit.join(', ')}</p>
                    <p><span className="font-semibold">Cane Sugar:</span> {caneSugarMl} ml</p>
                    <p>
                      <span className="font-semibold">Popping Boba:</span>{' '}
                      {selectedPoppingBoba.length > 0 ? selectedPoppingBoba.join(', ') : 'None'}
                    </p>
                    <p className="text-base font-bold text-primary pt-1">Price: ${sizePrices[size].toFixed(2)}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="btn-primary"
                      disabled={selectedSyrups.length === 0}
                    >
                      Add to Cart
                    </button>
                    <Link href="/cart" className="btn-outline">Go to Cart</Link>
                  </div>

                  {addedMessage && <p className="text-green-700 text-sm mt-3 font-semibold">{addedMessage}</p>}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40"
              >
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="px-4 py-2 rounded-lg bg-secondary text-white text-sm disabled:opacity-40"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-4 py-2 rounded-lg bg-dark text-white text-sm"
                >
                  Start Over
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-700 shadow-sm">
            <p className="font-semibold text-dark mb-1">Recipe rules applied</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tea base options: Jasmine Green Tea or Earl Grey Black Tea</li>
              <li>Syrup limit: up to 3 flavors</li>
              <li>16 oz uses 40 ml syrup and up to 20 ml cane sugar</li>
              <li>22 oz uses 60 ml syrup and up to 30 ml cane sugar</li>
              <li>Sugar can be reduced but not increased</li>
              <li>Popping boba only. No tapioca pearl in this builder</li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}
