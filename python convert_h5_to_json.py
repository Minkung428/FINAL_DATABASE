import os
import h5py
import pandas as pd

# กำหนดพาธไปยังโฟลเดอร์ที่เก็บไฟล์ .h5 ทั้งหมด
folder_path = "C:\\Users\\TUF\\Downloads\\millionsongsubset\\MillionSongSubset"  # หรือ path ที่คุณเก็บข้อมูลไว้

# ลิสต์สำหรับเก็บ DataFrame จากแต่ละไฟล์
all_data = []

# ใช้ os.walk เพื่อเดินผ่านทุกโฟลเดอร์ย่อย
for root, dirs, files in os.walk(folder_path):
    for filename in files:
        if filename.endswith(".h5"):
            file_path = os.path.join(root, filename)
            try:
                with h5py.File(file_path, 'r') as f:
                    data_dict = {}

                    # ดึงข้อมูลจาก metadata
                    if 'metadata' in f:
                        metadata = f['metadata']
                        if 'songs' in metadata:
                            songs = metadata['songs']
                            # ดึงข้อมูลทั้งหมดจาก metadata/songs
                            for key in songs.dtype.names:
                                value = songs[key][0]
                                data_dict[key] = value.decode() if isinstance(value, bytes) else value

                        # ดึงข้อมูลจาก artist_terms และ similar_artists
                        if 'artist_terms' in metadata:
                            artist_terms = metadata['artist_terms'][:]
                            data_dict['artist_terms'] = ", ".join([term.decode() for term in artist_terms])
                        
                        if 'similar_artists' in metadata:
                            similar_artists = metadata['similar_artists'][:]
                            data_dict['similar_artists'] = ", ".join([artist.decode() for artist in similar_artists])

                    # ดึงข้อมูลจาก analysis
                    if 'analysis' in f:
                        analysis = f['analysis']
                        if 'songs' in analysis:
                            songs = analysis['songs']
                            # ดึงข้อมูลทั้งหมดจาก analysis/songs
                            for key in songs.dtype.names:
                                data_dict[key] = songs[key][0]

                    # ดึงข้อมูลจาก musicbrainz
                    if 'musicbrainz' in f:
                        musicbrainz = f['musicbrainz']
                        if 'songs' in musicbrainz:
                            songs = musicbrainz['songs']
                            # ดึงข้อมูลทั้งหมดจาก musicbrainz/songs
                            for key in songs.dtype.names:
                                value = songs[key][0]
                                data_dict[key] = value.decode() if isinstance(value, bytes) else value

                    # เพิ่มข้อมูลลงในลิสต์
                    all_data.append(data_dict)

            except Exception as e:
                print(f"Error reading file {file_path}: {e}")

# สร้าง DataFrame และบันทึกข้อมูลในรูปแบบ CSV
if all_data:
    full_df = pd.DataFrame(all_data)

    # ตรวจสอบว่า Dataset_AllSong มีคอลัมน์ใดบ้างเพื่อปรับให้ตรงกัน
    reference_columns = [
        'track_id', 'artist_name', 'title', 'duration', 'year', 'tempo', 'key', 'mode',
        'time_signature', 'loudness', 'artist_terms', 'similar_artists', 'artist_mbtags',
        'artist_mbtags_count'
    ]

    # เพิ่มคอลัมน์ที่ขาดหายไปและจัดเรียงตามลำดับ
    for column in reference_columns:
        if column not in full_df.columns:
            full_df[column] = None

    full_df = full_df[reference_columns]

    # แทนค่าช่องที่ไม่มีข้อมูลเป็น "N/A"
    full_df.fillna("N/A", inplace=True)

    # บันทึกข้อมูลรวมในรูปแบบ CSV
    full_df.to_csv("C:\\Users\\TUF\\Documents\\combined_data_filtered2.csv", index=False)
    print("Data has been successfully combined and saved to 'combined_data_filtered.csv'.")
else:
    print("No valid HDF5 files found or no relevant data found within the files.")
