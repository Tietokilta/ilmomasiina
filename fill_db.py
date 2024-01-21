import psycopg2
from psycopg2.extras import execute_values
from faker import Faker
from datetime import datetime, timedelta
import random

# Initialize Faker
fake = Faker()
# Database connection parameters - update these with your database information
db_params = {
    "dbname": "ilmomasiina",
    "user": "ilmo_user",
    "password": "password",
    "host": "localhost",
    "port": 5432,
}


# Function to generate a unique event ID
def generate_event_id():
    return fake.bothify(text="????????????")


# Function to generate a unique quota ID
def generate_quota_id():
    return fake.bothify(text="????????????")


# Function to generate a unique signup ID
def generate_signup_id():
    return fake.bothify(text="????????????")


def generate_near_date(days=30):
    """Generate a date within +/- `days` days of the current date."""
    start_date = datetime.now() - timedelta(days=days)
    end_date = datetime.now() + timedelta(days=days)
    return fake.date_time_between(start_date=start_date, end_date=end_date)


with psycopg2.connect(**db_params) as conn:
    cur = conn.cursor()
    current_event_count = cur.execute("SELECT COUNT(*) FROM public.event")
    current_event_count = cur.fetchone()[0]


# Connect to the database
def insert_data(count=100):
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()
    for i in range(count):
        if i % 100 == 0:
            print(f"Inserted {i}/{count} events...")
        while True:
            event_id = generate_event_id()
            try:
                cur.execute(
                    'INSERT INTO public.event (id, title, slug, date, "registrationStartDate", "registrationEndDate", "openQuotaSize", description, price, location, "facebookUrl", "webpageUrl", category, draft, listed, "signupsPublic", "nameQuestion", "emailQuestion", "verificationEmail", "createdAt", "updatedAt", "deletedAt", "endDate") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    (
                        event_id,
                        fake.sentence(),
                        fake.slug(),
                        generate_near_date(),
                        generate_near_date(),
                        generate_near_date(),
                        random.randint(0, 100),
                        fake.text(),
                        fake.random_number(digits=3),
                        fake.city(),
                        fake.url(),
                        fake.url(),
                        fake.word(),
                        fake.boolean(),
                        fake.boolean(),
                        fake.boolean(),
                        fake.boolean(),
                        fake.boolean(),
                        fake.text(),
                        generate_near_date(),
                        generate_near_date(),
                        None,
                        generate_near_date(),
                    ),
                )
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                continue
            break
        quota_ids = []
        for _ in range(4):  # Generate 4 quotas for each event
            quota_id = generate_quota_id()
            quota_ids.append(quota_id)
            createdAt = generate_near_date()
            cur.execute(
                'INSERT INTO public.quota (id, "eventId", "order", title, size, "createdAt", "updatedAt", "deletedAt") VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
                (
                    quota_id,
                    event_id,
                    random.randint(1, 10),
                    fake.word(),
                    random.randint(1, 100),
                    createdAt,
                    createdAt,
                    None,
                ),
            )
            params = []
            for _ in range(100):  # Generate 100 signups for each event
                signup_id = generate_signup_id()
                selected_quota_id = random.choice(quota_ids)
                createdAt = generate_near_date()
                params.append(
                    (
                        signup_id,
                        selected_quota_id,
                        fake.first_name(),
                        fake.last_name(),
                        fake.boolean(),
                        fake.email(),
                        fake.date_time(),
                        random.choice(["in-quota", "in-open", "in-queue"]),
                        random.randint(1, 100),
                        createdAt,
                        createdAt,
                        None,
                        fake.language_code(),
                    )
                )
            execute_values(
                cur,
                'INSERT INTO public.signup (id, "quotaId", "firstName", "lastName", "namePublic", email, "confirmedAt", status, position, "createdAt", "updatedAt", "deletedAt", language) VALUES %s',
                params,
            )
            conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    num_events = 2000 - current_event_count
    print(f"Generating {num_events} events...")
    insert_data(num_events)
