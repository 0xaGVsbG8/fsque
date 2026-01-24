import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from app_independencies import GLOBAL_SUPERSTORE_CSV

# =========================
# loading data
# =========================

CSV_PATH = GLOBAL_SUPERSTORE_CSV
df = pd.read_csv(CSV_PATH)
df = df.dropna()
df = df[['Product ID','Product Name','Category','Sub-Category']].drop_duplicates('Product ID')
df['Product ID'] = df['Product ID'].astype(str)

# =========================
# Preparing prods cats
# =========================

# Column with cats – to TF-IDF
df['features'] = (
    df['Category'].astype(str) + ' ' +
    df['Sub-Category'].astype(str) + ' ' +
    df['Product Name'].astype(str)
)

# =========================
# 3. TF-IDF  on the whole base if needed
# =========================

tfidf = TfidfVectorizer(
    stop_words='english', 
    ngram_range=(1,2),
    max_features=5000,
    min_df=2,
    sublinear_tf=True
)

tfidf_matrix = tfidf.fit_transform(df['features'])

# =========================
# 4. Cosine similarity
# =========================

cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)

# =========================
# 5. Maping Product ID -> index w df
# =========================

indices = pd.Series(df.index, index=df['Product ID']).drop_duplicates()

# =========================
# 6. Def recommendation content-based use this to get them
# =========================

def recommend_cb(product_id: str, top_n: int = 5):
    product_id = str(product_id).strip()
    
    if product_id not in indices:
        raise ValueError(f"Nie ma takiego produktu w bazie: {product_id}")

    # product index in original df
    idx = indices[product_id]
    category = df.loc[idx, 'Category']
    sub_cat = df.loc[idx, 'Sub-Category']

    # filtering products only from the same category and subcategory
    df_filtered = df[(df['Category'] == category) & (df['Sub-Category'] == sub_cat)].reset_index(drop=True)

    # product index in df_filtered
    idx_filtered = df_filtered.index[df_filtered['Product ID'] == product_id][0]

    # TF-IDF only by names of prods in  that sub-cat
    tfidf_filtered = TfidfVectorizer(stop_words='english')
    tfidf_matrix_filtered = tfidf_filtered.fit_transform(df_filtered['Product Name'])

    # cosine similarity for filtered group
    cosine_sim_filtered = linear_kernel(tfidf_matrix_filtered, tfidf_matrix_filtered)

    # similarity scores
    sim_scores = list(enumerate(cosine_sim_filtered[idx_filtered]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:top_n+1]  # skipping the same prod

    product_indices = [i[0] for i in sim_scores]

    return df_filtered.iloc[product_indices][['Product ID','Product Name','Category','Sub-Category']]

# =========================
# 7. Test / example
# =========================

if __name__ == "__main__":
    prod = "TEC-PH-10002885"  # provide prod id here
    print("Input product:", prod)
    print("\nSimilar products (content-based):\n")
    print(recommend_cb(prod, top_n=5))
