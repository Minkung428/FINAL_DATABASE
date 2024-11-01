import os
import h5py
import pandas as pd

# Define the directory containing the .h5 files
directory_path = "C:\\Users\\TUF\\Downloads\\millionsongsubset\\MillionSongSubset"

# Initialize an empty DataFrame to store all the data
all_data = pd.DataFrame()

# Loop through each .h5 file in the directory
for root, dirs, files in os.walk(directory_path):
    for file in files:
        if file.endswith('.h5'):
            file_path = os.path.join(root, file)
            print(f"Processing file: {file_path}")
            
            # Open the .h5 file
            with h5py.File(file_path, 'r') as h5_file:
                # Initialize a dictionary to store extracted data
                data = {}
                
                # Check if 'analysis' key exists
                if 'analysis' in h5_file:
                    analysis_data = h5_file['analysis']
                    analysis_keys = [
                        'danceability', 'duration', 'end_of_fade_in', 'energy', 
                        'key', 'key_confidence', 'loudness', 'mode', 
                        'mode_confidence', 'sections_confidence', 'sections_start', 
                        'segments_confidence', 'segments_loudness_max', 
                        'segments_loudness_max_time', 'segments_loudness_start', 
                        'segments_pitches', 'segments_start', 'segments_timbre', 
                        'song_hotttnesss', 'start_of_fade_out', 'tatums_confidence', 
                        'tatums_start', 'tempo', 'time_signature', 
                        'time_signature_confidence'
                    ]
                    
                    # Extract data from the analysis group
                    for key in analysis_keys:
                        if key in analysis_data:
                            data[key] = analysis_data[key][()].tolist()  # Convert to list
                        else:
                            data[key] = [None]  # Use a list with None to maintain shape

                # Check for 'metadata' key existence and extract related fields
                if 'metadata' in h5_file:
                    metadata_data = h5_file['metadata']
                    data.update({
                        "artist_mbid": metadata_data.get('artist_mbid', [None]),
                        "artist_mbtags": metadata_data.get('artist_mbtags', [None]),
                        "artist_mbtags_count": metadata_data.get('artist_mbtags_count', [None]),
                        "artist_name": metadata_data.get('artist_name', [None]),
                        "artist_playmeid": metadata_data.get('artist_playmeid', [None]),
                        "artist_terms": metadata_data.get('artist_terms', [None]),
                        "artist_terms_freq": metadata_data.get('artist_terms_freq', [None]),
                        "artist_terms_weight": metadata_data.get('artist_terms_weight', [None]),
                        "release": metadata_data.get('release', [None]),
                        "release_7digitalid": metadata_data.get('release_7digitalid', [None]),
                        "similar_artists": metadata_data.get('similar_artists', [None]),
                        "track_id": metadata_data.get('track_id', [None]),
                    })
                else:
                    # If metadata is missing, fill with None lists
                    data.update({
                        "artist_mbid": [None],
                        "artist_mbtags": [None],
                        "artist_mbtags_count": [None],
                        "artist_name": [None],
                        "artist_playmeid": [None],
                        "artist_terms": [None],
                        "artist_terms_freq": [None],
                        "artist_terms_weight": [None],
                        "release": [None],
                        "release_7digitalid": [None],
                        "similar_artists": [None],
                        "track_id": [None],
                    })
                
                # Create a DataFrame with all values set to a list
                temp_df = pd.DataFrame({key: [value[0] if isinstance(value, list) and value else None] for key, value in data.items()})  # Create a DataFrame with a single row
                # Append the temp DataFrame to the main DataFrame
                all_data = pd.concat([all_data, temp_df], ignore_index=True)

# Save the combined data to a CSV file
output_csv_path = "C:\\Users\\TUF\\Downloads\\millionsongsubset\\combined_data.csv"
all_data.to_csv(output_csv_path, index=False)

print(f"Data conversion complete! CSV saved at: {output_csv_path}")
