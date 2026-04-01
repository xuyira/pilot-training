from setuptools import find_packages, setup


setup(
    name="pilot-training",
    version="0.1.0",
    description="Flight Cognitive Training System web scaffold",
    packages=find_packages(include=["src", "src.*"]),
    include_package_data=True,
    install_requires=[],
    entry_points={
        "console_scripts": [
            "pilot-training=src.main:main",
            "pilot-training-web=src.web.server:main",
        ]
    },
)
