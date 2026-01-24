import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from sklearn.metrics.pairwise import cosine_similarity
from difflib import get_close_matches

def recommend_based_on_prod(prod, top_n=10):
    # 1️⃣ Wczytanie danych
    df = pd.read_csv(r'E:\workspace\krowa\backend\store_stuff\Global_Superstore2.csv')
    # df = df.dropna()

    # 2️⃣ Fuzzy search – dopasuj produkt, jeśli literówka
    matches = get_close_matches(prod, df['Product Name'].values, n=1, cutoff=0.6)
    if not matches:
        print(f"Nie znaleziono produktu podobnego do '{prod}' w datasetcie")
        return []
    prod = matches[0]

    # 3️⃣ Pobierz kategorię i subkategorię
    product_info = df[df['Product Name'] == prod].iloc[0]
    cat = product_info['Category']
    subcat = product_info['Sub-Category']

    print(f"Recommending prods to buy in pair with: {prod} ({cat} - {subcat})")

    # 4️⃣ Filtracja produktów w tej samej kategorii i sub-kategorii
    df_subset = df[(df['Category'] == cat) & (df['Sub-Category'] == subcat)]

    # 5️⃣ Tworzenie koszyka OrderID x ProductName
    basket = df_subset.groupby(['Order ID', 'Product Name'])['Quantity'].sum().unstack().fillna(0)

    # Koszyki >1 produktu dla Apriori
    basket_multi = basket[basket.sum(axis=1) > 1]
    basket_bool = basket > 0  # bool do Apriori / cosine

    # 6️⃣ Apriori
    freq_items = apriori(
        basket_bool,
        min_support=0.00005,
        use_colnames=True,
        max_len=2
    )
    ...

    rules = pd.DataFrame()
    if not freq_items.empty:
        rules = association_rules(freq_items, metric='lift', min_threshold=1)

    # 7️⃣ Funkcja fallback – minimum top_n produktów
    def fallback(df_subset, cat, top_n):
        # Top produkty w sub-kategorii
        recs = df_subset['Product Name'].value_counts().head(top_n).index.tolist()
        if len(recs) < top_n:
            # Dołóż brakujące produkty z całej kategorii
            all_cat = df[df['Category'] == cat]
            more = [p for p in all_cat['Product Name'].value_counts().index if p not in recs]
            recs += more[:top_n - len(recs)]
        return recs[:top_n]

    # 8️⃣ Funkcja rekomendacji
    def recommend(product_name):
        # Apriori
        if not rules.empty and product_name in basket_bool.columns:
            apriori_recs = rules[rules['antecedents'].apply(lambda x: product_name in x)].sort_values('lift', ascending=False)
            if not apriori_recs.empty:
                recs = apriori_recs['consequents'].apply(lambda x: list(x)[0]).head(top_n).tolist()
                if len(recs) >= top_n:
                    return recs

        # Cosine similarity backup
        if product_name in basket_bool.columns and basket_bool.shape[1] > 1:
            sim = cosine_similarity(basket_bool.T.astype(int))
            sim_df = pd.DataFrame(sim, index=basket_bool.columns, columns=basket_bool.columns)
            recs = sim_df[product_name].sort_values(ascending=False).iloc[1:top_n+1].index.tolist()
            if len(recs) >= top_n:
                return recs

        # Fallback – top produkty w sub-kategorii + dopełnienie z kategorii
        return fallback(df_subset, cat, top_n)

    recs = recommend(prod)
    print(recs)
    return recs

# =========================
# Przykład użycia
# =========================
# recommend_based_on_prod('Apple iPhone 5C', top_n=10)
recommend_based_on_prod('Novimex Executive Leather Armchair', top_n=10)
# recommend_based_on_prod('Fellowes PB500 Electric Punch Plastic Comb Binding Machine with Manual Bind', top_n=10)
