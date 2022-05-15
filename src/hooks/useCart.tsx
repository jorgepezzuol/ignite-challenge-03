import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const KEY_ROCKET_SHOES = '@RocketShoes:cart';

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(KEY_ROCKET_SHOES);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartToUpdate = [...cart];
      const productInCart = cartToUpdate.find(
        (product) => product.id === productId
      );
      const amountInStock = await getAmountInStockById(productId);
      const amount = (productInCart ? productInCart.amount : 0) + 1;

      if (amount > amountInStock) {
        showAmountGreaterThanStockError();
        return;
      }

      if (productInCart) {
        productInCart.amount = amount;
      } else {
        const product = await getProductById(productId);
        const newProduct = {
          ...product,
          amount: amount,
        };
        cartToUpdate.push(newProduct);
      }

      setCartAndSaveToLocalStorage(cartToUpdate);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartToUpdate = [...cart];
      const productIndexToBeDeleted = cartToUpdate.findIndex(
        (product) => product.id === productId
      );

      if (productIndexToBeDeleted >= 0) {
        cartToUpdate.splice(productIndexToBeDeleted, 1);
        setCartAndSaveToLocalStorage(cartToUpdate);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const amountInStock = await getAmountInStockById(productId);

      if (amount > amountInStock || amount <= 0) {
        showAmountGreaterThanStockError();
        return;
      }

      const cartToUpdate = [...cart];
      const productInCart = cartToUpdate.find(
        (product) => product.id === productId
      );

      if (productInCart) {
        productInCart.amount = amount;
        setCartAndSaveToLocalStorage(cartToUpdate);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const showAmountGreaterThanStockError = () => {
    toast.error('Quantidade solicitada fora de estoque');
  };

  const getAmountInStockById = async (productId: number): Promise<number> => {
    const response = await api.get<Stock>(`/stock/${productId}`);

    return response.data.amount;
  };

  const getProductById = async (productId: number): Promise<Product> => {
    const response = await api.get<Product>(`/products/${productId}`);

    return response.data;
  };

  const setCartAndSaveToLocalStorage = (products: Product[]) => {
    setCart(products);
    localStorage.setItem(KEY_ROCKET_SHOES, JSON.stringify(products));
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
