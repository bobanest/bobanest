// Facebook tracking utility functions
export const trackFacebookEvent = (eventName, parameters = {}, customData = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, {
      ...parameters,
      ...customData
    });
  }
};

export const trackAddToCart = (product, quantity = 1) => {
  trackFacebookEvent('AddToCart', {
    content_name: product.name,
    content_ids: [product._id || product.id],
    content_type: 'product',
    value: product.price * quantity,
    currency: 'USD',
    quantity: quantity
  });
};

export const trackInitiateCheckout = (cartItems, totalValue) => {
  const contentIds = cartItems.map(item => item.id || item._id);
  const contents = cartItems.map(item => ({
    id: item.id || item._id,
    quantity: item.quantity,
    item_price: item.price
  }));

  trackFacebookEvent('InitiateCheckout', {
    content_ids: contentIds,
    contents: contents,
    content_type: 'product',
    value: totalValue,
    currency: 'USD',
    num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0)
  });
};

export const trackPurchase = (orderId, totalValue, cartItems) => {
  const contentIds = cartItems.map(item => item.id || item._id);
  const contents = cartItems.map(item => ({
    id: item.id || item._id,
    quantity: item.quantity,
    item_price: item.price
  }));

  trackFacebookEvent('Purchase', {
    content_ids: contentIds,
    contents: contents,
    content_type: 'product',
    value: totalValue,
    currency: 'USD',
    num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    order_id: orderId
  });
};

export const trackLead = (formType = 'contact') => {
  trackFacebookEvent('Lead', {
    content_name: formType,
    content_category: 'contact'
  });
};

export const trackCompleteRegistration = (method = 'loyalty') => {
  trackFacebookEvent('CompleteRegistration', {
    content_name: method,
    status: 'completed'
  });
};

export const trackViewContent = (contentType, contentName, contentId) => {
  trackFacebookEvent('ViewContent', {
    content_type: contentType,
    content_name: contentName,
    content_ids: [contentId]
  });
};