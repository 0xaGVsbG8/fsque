from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import uuid
from app_independencies import GLOBAL_SUPERSTORE_CSV, PRODS_CATALOG

# ======================
# LOAD DATA
# ======================

# df = pd.read_csv(r'E:\workspace\projjjj\backend\store_stuff\Global_Superstore2.csv')
df = pd.read_csv(GLOBAL_SUPERSTORE_CSV)
prods_df = pd.read_csv(PRODS_CATALOG)

RETURN_FROM_THE_SAME_CAT = True

df = df.dropna()
keep_df = df.copy()
df = df[['Category','Customer Name', 'Product Name', 'Sales']]
# df = df[df['Category'].isin(['Technology'])] 

# Build initial user-item matrix
user_item_matrix = df.pivot_table(
    index='Customer Name',
    columns='Product Name',
    values='Sales',
    aggfunc='sum'
).fillna(0)

"""
Pivot Table

Product Name
Customer name   iPhone   printer
Alice              100     50
Bob                 2     10

"""




# ======================
# ADD CART TO MATRIX doesnt affect a main one
# ======================

def add_cart_to_matrix(user, cart, matrix):
    """Adds cart items as implicit feedback (1) for the given user."""
    
    # Add user row if missing
    # print(matrix[matrix['Category']=='ss'], 'dd')
    if user not in matrix.index:
        matrix.loc[user] = 0
    
    for prod in cart:
        # Add product column if missing
        if prod not in matrix.columns:
            matrix[prod] = 0
        
        # Set implicit feedback
        matrix.loc[user, prod] = 1

    print("added to cart")
    return matrix


# ======================
# DYNAMIC SIMILARITY FOR THIS USER
# ======================

def dynamic_similarity_for_user(user, matrix):
    """Recalculate cosine similarity ONLY for this one user."""
    
    target_vector = matrix.loc[user].values.reshape(1, -1)
    all_vectors = matrix.values
    
    sims = cosine_similarity(target_vector, all_vectors)[0]
    
    """
    users matrix
    [1,1,0,0]
    
    other
    
    [[1,0,1,0],   
    [1,1,0,0],   
    [0,1,1,1],  
    [1,0,0,1]]   
            
            
    calculates similarity to the rest of them
    
    return similarity to users
    
    
    Alice 0.5
    Bob 0.8
    
    """
    
    return pd.Series(sims, index=matrix.index)


# ======================
# RECOMMENDATION FUNCTION
# ======================

def recommend_products(user, matrix, similarity_col, top_n=5):
    
    similar_users = similarity_col.sort_values(ascending=False).drop(user)

    recommendations = pd.Series(dtype=float)

    for sim_user, sim_score in similar_users.items():
        # Select products that user does NOT have
        products = matrix.loc[sim_user][matrix.loc[user] == 0] * sim_score
        
        recommendations = pd.concat([recommendations, products])

    recommendations = recommendations.groupby(recommendations.index).sum()

    return recommendations.sort_values(ascending=False).head(top_n)


def get_prods_cats(cart):
    prods_cats = prods_df[prods_df['Product ID'].isin(cart)]['Product Category'].unique()
    return prods_cats


def get_recomendation(cart: list):
    global user_item_matrix

    client_name = str(uuid.uuid4())

    # fetching cats that are in the cart
    cart_cats = keep_df[keep_df['Product ID'].isin(cart)]['Category'].unique()

    # Creating matrix with only allowed cats
    allowed_products = keep_df[keep_df['Category'].isin(cart_cats)]['Product Name'].unique()
    allowed_products_in_matrix = [p for p in allowed_products if p in user_item_matrix.columns]
    # allowed_products_in_matrix = user_item_matrix

    if not allowed_products_in_matrix:
        print("Brak produktów w macierzy z kategorii koszyka")
        return pd.Series(dtype=float), []

    # Add cart to users matrix
    user_item_matrix = add_cart_to_matrix(client_name, cart, user_item_matrix)

    # Dynamic similarity for this user
    similarity_series = dynamic_similarity_for_user(client_name, user_item_matrix)

    # Make a recs only on allowed cats
    matrix_filtered = user_item_matrix[allowed_products_in_matrix]
    
    
    recs = recommend_products(client_name, matrix_filtered if RETURN_FROM_THE_SAME_CAT else user_item_matrix, similarity_series, top_n=5)

    # Parsing data
    prods_id = keep_df[keep_df["Product Name"].isin(recs.index.tolist())]["Product ID"].unique().tolist()

    return recs, prods_id

# ======================
# TEST
# ======================

if __name__ == "__main__":
    ...
    # client_name = "Rick sssxx"
    # cart = [
    #     "Nokia Smart Phone, with Caller ID",
    #     "Motorola Smart Phone, Cordless"
    # ]

    # # 1) Add cart as implicit purchases
    # user_item_matrix = add_cart_to_matrix(client_name, cart, user_item_matrix)

    # # 2) Dynamic similarity for THIS user only
    # similarity_series = dynamic_similarity_for_user(client_name, user_item_matrix)

    # # 3) Recommend
    # recs = recommend_products(client_name, user_item_matrix, similarity_series, top_n=5)

    # prev_purchases = df[df['Customer Name'] == client_name]['Product Name'].tolist()

    # print(f"\nRekomendacje dla {client_name}:\n")
    # print(recs)

    # print("\nHistoryczne zakupy:")
    # print(prev_purchases)

    # print("\nKoszyk:")
    # print(cart)

    # print("\nŁącznie produktów branych pod uwagę:", len(prev_purchases) + len(cart))
