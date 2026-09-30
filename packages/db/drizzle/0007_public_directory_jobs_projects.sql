CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name text NOT NULL UNIQUE,
  tagline text,
  description text NOT NULL,
  website_url text NOT NULL,
  careers_url text,
  engineering_url text,
  repository_url text,
  headquarters text,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','SOURCE_REVIEWED','DOMAIN_VERIFIED')),
  source_url text,
  source_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
--> statement-breakpoint
CREATE TABLE organization_technologies (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('LANGUAGE','FRAMEWORK','PLATFORM','INFRASTRUCTURE','DATA','PRACTICE')),
  source_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id,name)
);
--> statement-breakpoint
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,96}[a-z0-9]$'),
  title text NOT NULL,
  summary text NOT NULL,
  location text NOT NULL,
  workplace_type text NOT NULL CHECK (workplace_type IN ('REMOTE','HYBRID','ONSITE')),
  employment_type text NOT NULL CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP')),
  salary_min integer NOT NULL CHECK (salary_min > 0),
  salary_max integer NOT NULL CHECK (salary_max >= salary_min),
  salary_currency char(3) NOT NULL DEFAULT 'USD' CHECK (salary_currency ~ '^[A-Z]{3}$'),
  salary_interval text NOT NULL DEFAULT 'YEAR' CHECK (salary_interval IN ('HOUR','YEAR')),
  skill_tags text[] NOT NULL DEFAULT '{}',
  source_url text NOT NULL UNIQUE,
  source_checked_at timestamptz NOT NULL,
  source_status text NOT NULL DEFAULT 'SOURCE_REVIEWED' CHECK (source_status IN ('SOURCE_REVIEWED','EXPIRED','REMOVED')),
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
--> statement-breakpoint
CREATE TABLE project_tags (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id,tag)
);
--> statement-breakpoint
CREATE INDEX organizations_public_directory_idx ON organizations(slug) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX jobs_public_listing_idx ON jobs(source_status,created_at DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX jobs_organization_created_idx ON jobs(organization_id,created_at DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX project_tags_tag_idx ON project_tags(tag);
--> statement-breakpoint
INSERT INTO organizations (slug,name,tagline,description,website_url,careers_url,engineering_url,repository_url,headquarters,verification_status,source_url,source_checked_at) VALUES
('rust-foundation','Rust Foundation','Supporting the Rust programming language and its ecosystem.','A source-reviewed public directory record for the Rust Foundation and its open-source ecosystem. This page does not represent an official affiliation.','https://rustfoundation.org','https://rustfoundation.org/careers/','https://blog.rust-lang.org/','https://github.com/rust-lang','United States','SOURCE_REVIEWED','https://rustfoundation.org',now()),
('kubernetes','Kubernetes','Open-source container orchestration.','A source-reviewed public directory record for the Kubernetes project. This page does not represent an official affiliation.','https://kubernetes.io',NULL,'https://kubernetes.io/blog/','https://github.com/kubernetes/kubernetes','Global','SOURCE_REVIEWED','https://kubernetes.io',now()),
('postgresql','PostgreSQL','The open-source relational database.','A source-reviewed public directory record for the PostgreSQL community. This page does not represent an official affiliation.','https://www.postgresql.org',NULL,'https://www.postgresql.org/about/press/','https://github.com/postgres/postgres','Global','SOURCE_REVIEWED','https://www.postgresql.org',now()),
('nodejs','OpenJS Foundation · Node.js','The JavaScript runtime ecosystem.','A source-reviewed public directory record for the Node.js project. This page does not represent an official affiliation.','https://nodejs.org',NULL,'https://nodejs.org/en/blog','https://github.com/nodejs/node','Global','SOURCE_REVIEWED','https://nodejs.org',now()),
('python-software-foundation','Python Software Foundation','Supporting the Python programming language.','A source-reviewed public directory record for the Python Software Foundation. This page does not represent an official affiliation.','https://www.python.org',NULL,'https://blog.python.org/','https://github.com/python/cpython','United States','SOURCE_REVIEWED','https://www.python.org',now()),
('django','Django','The web framework for perfectionists with deadlines.','A source-reviewed public directory record for the Django project. This page does not represent an official affiliation.','https://www.djangoproject.com',NULL,'https://www.djangoproject.com/weblog/','https://github.com/django/django','Global','SOURCE_REVIEWED','https://www.djangoproject.com',now()),
('mozilla','Mozilla','Building a better internet.','A source-reviewed public directory record for Mozilla. This page does not represent an official affiliation.','https://www.mozilla.org','https://www.mozilla.org/careers/','https://blog.mozilla.org/','https://github.com/mozilla','Global','SOURCE_REVIEWED','https://www.mozilla.org',now()),
('gitlab','GitLab','The DevSecOps platform.','A source-reviewed public directory record for GitLab. This page does not represent an official affiliation.','https://about.gitlab.com','https://about.gitlab.com/jobs/','https://about.gitlab.com/blog/','https://gitlab.com/gitlab-org/gitlab','Remote-first','SOURCE_REVIEWED','https://about.gitlab.com',now()),
('cloudflare','Cloudflare','Helping build a better internet.','A source-reviewed public directory record for Cloudflare. This page does not represent an official affiliation.','https://www.cloudflare.com','https://www.cloudflare.com/careers/jobs/','https://blog.cloudflare.com/','https://github.com/cloudflare','San Francisco, CA','SOURCE_REVIEWED','https://www.cloudflare.com',now()),
('vercel','Vercel','The frontend cloud.','A source-reviewed public directory record for Vercel. This page does not represent an official affiliation.','https://vercel.com','https://vercel.com/careers','https://vercel.com/blog','https://github.com/vercel','San Francisco, CA','SOURCE_REVIEWED','https://vercel.com',now()),
('digitalocean','DigitalOcean','Cloud infrastructure for developers.','A source-reviewed public directory record for DigitalOcean. This page does not represent an official affiliation.','https://www.digitalocean.com','https://www.digitalocean.com/careers','https://www.digitalocean.com/blog','https://github.com/digitalocean','New York, NY','SOURCE_REVIEWED','https://www.digitalocean.com',now()),
('dave','Dave','Financial products for the underdog.','A source-reviewed public directory record based on Dave public career materials. This page does not represent an official affiliation.','https://dave.com','https://dave.com/careers',NULL,NULL,'Los Angeles, CA','SOURCE_REVIEWED','https://dave.com',now()),
('blackpoint-cyber','Blackpoint Cyber','Managed detection and response security.','A source-reviewed public directory record based on Blackpoint Cyber public career materials. This page does not represent an official affiliation.','https://blackpointcyber.com','https://blackpointcyber.com/careers/',NULL,NULL,'Ellicott City, MD','SOURCE_REVIEWED','https://blackpointcyber.com',now()),
('alten-technology','ALTEN Technology USA','Engineering and technology consulting.','A source-reviewed public directory record based on ALTEN Technology USA public career materials. This page does not represent an official affiliation.','https://www.altentech.com','https://www.altentech.com/careers/',NULL,NULL,'Troy, MI','SOURCE_REVIEWED','https://www.altentech.com',now()),
('voyager-technologies','Voyager Technologies','Defense and space technology.','A source-reviewed public directory record based on Voyager Technologies public career materials. This page does not represent an official affiliation.','https://voyagertechnologies.com','https://voyagertechnologies.com/careers/',NULL,NULL,'Denver, CO','SOURCE_REVIEWED','https://voyagertechnologies.com',now()),
('assetwatch','AssetWatch','Predictive maintenance technology.','A source-reviewed public directory record based on AssetWatch public career materials. This page does not represent an official affiliation.','https://assetwatch.com','https://assetwatch.com/careers/',NULL,NULL,'Columbus, OH','SOURCE_REVIEWED','https://assetwatch.com',now()),
('traackr','Traackr','Influencer marketing data platform.','A source-reviewed public directory record based on Traackr public career materials. This page does not represent an official affiliation.','https://www.traackr.com','https://www.traackr.com/careers',NULL,NULL,'San Francisco, CA','SOURCE_REVIEWED','https://www.traackr.com',now()),
('curai','Curai Health','Virtual care powered by clinicians and technology.','A source-reviewed public directory record based on Curai public career materials. This page does not represent an official affiliation.','https://www.curaihealth.com','https://www.curaihealth.com/careers',NULL,NULL,'San Francisco, CA','SOURCE_REVIEWED','https://www.curaihealth.com',now()),
('calendly','Calendly','Scheduling automation platform.','A source-reviewed public directory record based on Calendly public career materials. This page does not represent an official affiliation.','https://calendly.com','https://careers.calendly.com',NULL,NULL,'Atlanta, GA','SOURCE_REVIEWED','https://calendly.com',now()),
('industrial-electric-manufacturing','Industrial Electric Manufacturing','Electrical distribution systems.','A source-reviewed public directory record based on IEM public career materials. This page does not represent an official affiliation.','https://www.iemfg.com','https://www.iemfg.com/careers/',NULL,NULL,'Fremont, CA','SOURCE_REVIEWED','https://www.iemfg.com',now()),
('kaleo','Kaléo','Drug-delivery technology.','A source-reviewed public directory record based on Kaléo public career materials. This page does not represent an official affiliation.','https://kaleo.com','https://kaleo.com/careers/',NULL,NULL,'Richmond, VA','SOURCE_REVIEWED','https://kaleo.com',now()),
('sandboxaq','SandboxAQ','AI and quantum technology.','A source-reviewed public directory record based on SandboxAQ public career materials. This page does not represent an official affiliation.','https://www.sandboxaq.com','https://www.sandboxaq.com/careers/',NULL,NULL,'Palo Alto, CA','SOURCE_REVIEWED','https://www.sandboxaq.com',now()),
('betterhelp','BetterHelp','Online mental health services.','A source-reviewed public directory record based on BetterHelp public career materials. This page does not represent an official affiliation.','https://www.betterhelp.com','https://www.betterhelp.com/careers/',NULL,NULL,'Mountain View, CA','SOURCE_REVIEWED','https://www.betterhelp.com',now()),
('toast','Toast','Restaurant technology platform.','A source-reviewed public directory record based on Toast public career materials. This page does not represent an official affiliation.','https://pos.toasttab.com','https://careers.toasttab.com',NULL,NULL,'Boston, MA','SOURCE_REVIEWED','https://pos.toasttab.com',now()),
('cross-river','Cross River','Embedded financial technology.','A source-reviewed public directory record based on Cross River public career materials. This page does not represent an official affiliation.','https://www.crossriver.com','https://www.crossriver.com/careers/',NULL,NULL,'Fort Lee, NJ','SOURCE_REVIEWED','https://www.crossriver.com',now()),
('gather','Gather','Virtual offices for remote teams.','A source-reviewed public directory record based on Gather public career materials. This page does not represent an official affiliation.','https://www.gather.town','https://www.gather.town/careers',NULL,NULL,'Remote-first','SOURCE_REVIEWED','https://www.gather.town',now())
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO organization_technologies (organization_id,name,category,source_url)
SELECT id,'Rust','LANGUAGE','https://github.com/rust-lang' FROM organizations WHERE slug='rust-foundation'
UNION ALL SELECT id,'Go','LANGUAGE','https://github.com/kubernetes/kubernetes' FROM organizations WHERE slug='kubernetes'
UNION ALL SELECT id,'C','LANGUAGE','https://github.com/postgres/postgres' FROM organizations WHERE slug='postgresql'
UNION ALL SELECT id,'JavaScript','LANGUAGE','https://github.com/nodejs/node' FROM organizations WHERE slug='nodejs'
UNION ALL SELECT id,'Python','LANGUAGE','https://github.com/python/cpython' FROM organizations WHERE slug='python-software-foundation'
UNION ALL SELECT id,'Python','LANGUAGE','https://github.com/django/django' FROM organizations WHERE slug='django'
UNION ALL SELECT id,'Rust','LANGUAGE','https://github.com/mozilla' FROM organizations WHERE slug='mozilla'
UNION ALL SELECT id,'Ruby','LANGUAGE','https://gitlab.com/gitlab-org/gitlab' FROM organizations WHERE slug='gitlab'
UNION ALL SELECT id,'Rust','LANGUAGE','https://github.com/cloudflare' FROM organizations WHERE slug='cloudflare'
UNION ALL SELECT id,'TypeScript','LANGUAGE','https://github.com/vercel' FROM organizations WHERE slug='vercel'
UNION ALL SELECT id,'Go','LANGUAGE','https://github.com/digitalocean' FROM organizations WHERE slug='digitalocean'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO jobs (organization_id,slug,title,summary,location,workplace_type,employment_type,salary_min,salary_max,salary_currency,skill_tags,source_url,source_checked_at) VALUES
((SELECT id FROM organizations WHERE slug='dave'),'dave-senior-software-engineer-fullstack','Senior Software Engineer, Fullstack','Build and operate full-stack financial technology products in a virtual-first team.','United States','REMOTE','FULL_TIME',150000,187000,'USD',ARRAY['TypeScript','Backend','Product engineering'],'https://jobs.ashbyhq.com/dave/46c99e96-9cf5-4dfd-a20e-62acd5a4693c/',now()),
((SELECT id FROM organizations WHERE slug='blackpoint-cyber'),'blackpoint-senior-software-engineer-data-backend','Senior Software Engineer, Data/Backend','Develop data infrastructure and backend systems for a cybersecurity product team.','Canada','REMOTE','FULL_TIME',131000,164000,'CAD',ARRAY['Data infrastructure','Backend','Cybersecurity'],'https://jobs.ashbyhq.com/Blackpoint%20Cyber/4aed2b37-f77f-4dc2-a2e7-5b52d53df311?embed=js',now()),
((SELECT id FROM organizations WHERE slug='alten-technology'),'alten-mechanical-engineer-structural-analysis','Mechanical Engineer II, Structural Analysis','Analyze and develop mechanical and electromechanical systems across aerospace, medical, robotics, and EV work.','United States','REMOTE','FULL_TIME',100000,125000,'USD',ARRAY['FEA','Nastran','SolidWorks'],'https://job-boards.greenhouse.io/altentechnologyusa/jobs/5229352007',now()),
((SELECT id FROM organizations WHERE slug='voyager-technologies'),'voyager-automation-engineer','Automation Engineer','Build and operate automation systems for space, defense, and national-security technology.','United States','REMOTE','FULL_TIME',160000,180000,'USD',ARRAY['Automation','Infrastructure','Security'],'https://job-boards.greenhouse.io/voyagertechnologiesinc/jobs/4401425009',now()),
((SELECT id FROM organizations WHERE slug='assetwatch'),'assetwatch-mechanical-engineer','Mechanical Engineer','Develop and test production-ready hardware for predictive-maintenance systems.','United States','REMOTE','FULL_TIME',117000,140000,'USD',ARRAY['SolidWorks','Product development','Mechanical engineering'],'https://job-boards.greenhouse.io/assetwatch/jobs/4715502005',now()),
((SELECT id FROM organizations WHERE slug='traackr'),'traackr-software-engineer-cloud-devex','Software Engineer, Cloud/DevEx','Build cloud and developer-experience systems for a remote-first SaaS team.','Mexico','REMOTE','FULL_TIME',70000,80000,'USD',ARRAY['Cloud','Developer experience','Documentation'],'https://jobs.lever.co/traackr/41b9c7de-a99b-48f6-819b-a617fcf7b440',now()),
((SELECT id FROM organizations WHERE slug='curai'),'curai-senior-software-engineer','Senior Software Engineer','Deliver full-stack healthcare technology alongside product, engineering, and clinical teams.','United States','REMOTE','FULL_TIME',170000,210000,'USD',ARRAY['Full stack','APIs','Healthcare'],'https://jobs.lever.co/curai/1fbe29c0-1ebd-46f1-bfe6-cb1bc9b060a3',now()),
((SELECT id FROM organizations WHERE slug='calendly'),'calendly-staff-platform-engineer','Staff Platform Engineer','Build a self-service platform for product engineers using Go and Kubernetes.','United States','REMOTE','FULL_TIME',238968,347488,'USD',ARRAY['Go','Kubernetes','Platform engineering'],'https://job-boards.greenhouse.io/calendly/jobs/8628979002',now()),
((SELECT id FROM organizations WHERE slug='industrial-electric-manufacturing'),'iem-estimation-engineer','Estimation Engineer','Prepare and analyze technical proposals for electrical distribution projects.','United States','REMOTE','FULL_TIME',100000,120000,'USD',ARRAY['Estimation','Electrical engineering','Proposals'],'https://job-boards.greenhouse.io/industrialelectricmanufacturing/jobs/4375329009',now()),
((SELECT id FROM organizations WHERE slug='kaleo'),'kaleo-mechanical-design-engineer','Mechanical Design Engineer','Develop drug-delivery platforms and guide product work from concept through test.','United States','REMOTE','FULL_TIME',90000,120000,'USD',ARRAY['Mechanical design','SolidWorks','Product development'],'https://job-boards.greenhouse.io/kaleo/jobs/7995778003',now()),
((SELECT id FROM organizations WHERE slug='sandboxaq'),'sandboxaq-machine-learning-engineer-causal-discovery','Machine Learning Engineer, Causal Discovery','Develop causal-discovery and machine-learning capabilities for scientific and enterprise work.','United States or Canada','REMOTE','FULL_TIME',133000,186000,'USD',ARRAY['Machine learning','Causal inference','Cloud'],'https://boards.greenhouse.io/embed/job_app?for=sandboxaq&token=5562099004',now()),
((SELECT id FROM organizations WHERE slug='betterhelp'),'betterhelp-senior-ml-ai-platform-engineer','Senior ML/AI Platform Engineer','Build machine-learning platform capabilities for a remote mental-health technology team.','United States','REMOTE','FULL_TIME',170000,200000,'USD',ARRAY['Machine learning','Platform engineering','AI'],'https://boards.greenhouse.io/embed/job_app?token=4520061008',now()),
((SELECT id FROM organizations WHERE slug='toast'),'toast-principal-cloud-engineer','Principal Cloud Engineer','Lead cloud-native infrastructure design for restaurant technology systems.','United States','REMOTE','FULL_TIME',188000,301000,'USD',ARRAY['AWS','Cloud','Infrastructure'],'https://boards.greenhouse.io/embed/job_app?token=6773184',now()),
((SELECT id FROM organizations WHERE slug='cross-river'),'cross-river-senior-software-engineer','Senior Software Engineer','Build core banking and payment systems for an embedded-finance platform.','United States','REMOTE','FULL_TIME',150000,180000,'USD',ARRAY['.NET','PostgreSQL','AWS'],'https://boards.greenhouse.io/embed/job_app?token=6559495003',now()),
((SELECT id FROM organizations WHERE slug='gather'),'gather-staff-backend-engineer-platform','Staff Backend Engineer, Platform','Build platform services for a remote-work communication product.','United States','REMOTE','FULL_TIME',187850,237575,'USD',ARRAY['Backend','Platform engineering','Remote collaboration'],'https://boards.greenhouse.io/embed/job_app?for=gather&token=5008925004',now())
ON CONFLICT (source_url) DO NOTHING;
