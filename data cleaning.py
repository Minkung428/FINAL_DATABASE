import pandas as pd

# Load the CSV file
file_path = r"C:\Users\TUF\Documents\combined_data_filtered.csv"
data = pd.read_csv(file_path)

# Drop rows with NaN values in 'title' and 'artist_terms'
data_cleaned = data.dropna(subset=['title', 'artist_terms'])

# Drop 'artist_mbtags' and 'artist_mbtags_count' columns as they contain only NaN values
data_cleaned = data_cleaned.drop(columns=['artist_mbtags', 'artist_mbtags_count'])

# Remove 'b' characters from 'track_id' (fix encoding issue)
data_cleaned['track_id'] = data_cleaned['track_id'].str.replace(r"^b'|'$", "", regex=True)

# Replace 'year' values of 0 with NaN
data_cleaned['year'] = data_cleaned['year'].replace(0, pd.NA)

# Save the cleaned data to a new CSV file
output_path = r"C:\Users\TUF\Documents\combined_data_cleaned.csv"
data_cleaned.to_csv(output_path, index=False)

print("Data cleaned and saved to:", output_path)
